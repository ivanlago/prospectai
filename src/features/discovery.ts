import { and, count, desc, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, companySources, discoveryResults, searchRuns, searches, websiteReviews } from "@/db/schema";
import { searchForm } from "@/domain";
import { getDiscoveryProvider } from "@/integrations/discovery/registry";
import { ProviderError, type SavedSearch } from "@/integrations/discovery/provider";

const runningTimeout = 60000;
const active = new Map<string, AbortController>();

export const discoveryNotices: Record<string, string> = {
  disabled: "A fonte OpenStreetMap está desabilitada neste ambiente.",
  missing: "Pesquisa indisponível.",
  filters: "Confira o município, a UF e os filtros compatíveis com OpenStreetMap.",
  unsupported: "Para usar OpenStreetMap, deixe avaliação, mínimo de avaliações e raio vazios. O limite é de 50 resultados em cidades brasileiras.",
  daily: "Limite de cinco chamadas nas últimas 24 horas atingido.",
  cooldown: "Aguarde pelo menos um minuto entre chamadas ao provedor.",
  running: "Já existe uma pesquisa em andamento.",
  busy: "O provedor limitou as consultas. Tente novamente mais tarde.",
  upstream: "O provedor está indisponível. Tente novamente mais tarde.",
  partial: "O provedor interrompeu a consulta e retornou dados incompletos.",
  timeout: "A execução excedeu o tempo permitido.",
  invalid: "O provedor retornou uma resposta inválida ou acima do limite.",
  coverage: "O extrato local cobre Salvador, Lauro de Freitas e Camaçari, na Bahia.",
  extract: "O extrato municipal está indisponível ou inválido.",
};

export async function executeDiscovery(searchId: string, category: unknown, source: unknown, replay?: SavedSearch) {
  const provider = getDiscoveryProvider(source);
  if (!provider) return { error: "disabled" };
  const db = getDb();
  const [search] = await db.select().from(searches).where(eq(searches.id, searchId));
  if (!search) return { error: "missing" };
  const saved = replay ?? searchForm.safeParse({ ...(search.config as object), name: search.name }).data;
  if (!saved) return { error: "filters" };
  const prepared = provider.prepare(saved, category);
  if ("error" in prepared) return { error: prepared.error };
  const { filters } = prepared;
  const reserved = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(7384502)`);
    const stale = new Date(Date.now() - runningTimeout);
    await tx.update(searchRuns).set({ status: "failed", error: "timeout", finishedAt: new Date() })
      .where(and(eq(searchRuns.status, "running"), lt(searchRuns.createdAt, stale)));
    const [running] = await tx.select({ id: searchRuns.id }).from(searchRuns).where(eq(searchRuns.status, "running")).limit(1);
    if (running) return { error: "running" };
    await tx.delete(discoveryResults).where(sql`${discoveryResults.runId} in (
      select ${searchRuns.id} from ${searchRuns} where ${searchRuns.expiresAt} <= now()
    )`);
    if (provider.cacheMs) {
      const [cached] = await tx.select().from(searchRuns).where(and(
        eq(searchRuns.provider, provider.id), eq(searchRuns.status, "completed"),
        gt(searchRuns.createdAt, new Date(Date.now() - provider.cacheMs)),
        gt(searchRuns.expiresAt, new Date()),
        sql`${searchRuns.filters} - 'snapshotDate' = ${JSON.stringify(filters)}::jsonb`,
      )).orderBy(desc(searchRuns.createdAt)).limit(1);
      if (cached) {
        const [run] = await tx.insert(searchRuns).values({
          searchId, provider: provider.id, status: "completed", finishedAt: new Date(),
          filters: { ...(cached.filters as object), cachedFrom: cached.id, consultedAt: cached.createdAt.toISOString() },
          expiresAt: cached.expiresAt, resultCount: cached.resultCount, truncated: cached.truncated,
        }).returning({ id: searchRuns.id });
        await tx.insert(discoveryResults).select(tx.select({
          id: sql<string>`gen_random_uuid()`.as("id"),
          runId: sql<string>`${run.id}::uuid`.as("run_id"),
          reference: discoveryResults.reference, name: discoveryResults.name, website: discoveryResults.website,
          district: discoveryResults.district, identityKey: discoveryResults.identityKey,
        }).from(discoveryResults).where(eq(discoveryResults.runId, cached.id)));
        return { id: run.id, cached: true };
      }
    }
    if (provider.quota) {
      const calls = and(eq(searchRuns.provider, provider.id), sql`${searchRuns.filters}->>'cachedFrom' is null`);
      const [recent] = await tx.select({ id: searchRuns.id }).from(searchRuns).where(
        and(calls, gt(searchRuns.createdAt, new Date(Date.now() - provider.quota.cooldownMs))),
      ).limit(1);
      if (recent) return { error: "cooldown" };
      const [used] = await tx.select({ total: count() }).from(searchRuns).where(
        and(calls, gt(searchRuns.createdAt, new Date(Date.now() - 86400000))),
      );
      if (used.total >= provider.quota.dailyLimit) return { error: "daily" };
    }
    const [run] = await tx.insert(searchRuns).values({
      searchId, provider: provider.id, filters, expiresAt: new Date(Date.now() + provider.retentionMs),
    }).returning({ id: searchRuns.id });
    return { id: run.id };
  });
  if (!reserved.id) return { error: reserved.error };
  const runId = reserved.id;
  if (reserved.cached) return { id: runId };
  const controller = new AbortController();
  active.set(runId, controller);
  try {
    const { results, truncated, snapshotDate } = await prepared.search(controller.signal);
    await db.transaction(async tx => {
      const [updated] = await tx.update(searchRuns).set({
        status: "completed", finishedAt: new Date(), resultCount: results.length, truncated,
        filters: { ...filters, snapshotDate },
      }).where(and(eq(searchRuns.id, runId), eq(searchRuns.status, "running"))).returning({ id: searchRuns.id });
      if (updated && results.length) await tx.insert(discoveryResults).values(results.map(result => ({ ...result, runId })));
    });
  } catch (error) {
    let code = "invalid";
    if (error instanceof ProviderError && ["busy", "upstream", "partial", "coverage", "extract"].includes(error.code)) code = error.code;
    else if (error instanceof Error && error.name === "TimeoutError") code = "timeout";
    await db.update(searchRuns).set({ status: "failed", finishedAt: new Date(), error: code })
      .where(and(eq(searchRuns.id, runId), eq(searchRuns.status, "running")));
    if (!controller.signal.aborted) console.warn({ event: "discovery.failed", provider: provider.id, code, runId });
  } finally {
    active.delete(runId);
  }
  return { id: runId };
}

export async function cancelDiscovery(runId: string) {
  const [cancelled] = await getDb().update(searchRuns).set({ status: "cancelled", finishedAt: new Date() })
    .where(and(eq(searchRuns.id, runId), eq(searchRuns.status, "running"))).returning({ id: searchRuns.id });
  if (cancelled) active.get(runId)?.abort();
}

export function getRuns(searchId: string, page: number) {
  return getDb().select().from(searchRuns).where(eq(searchRuns.searchId, searchId))
    .orderBy(desc(searchRuns.createdAt), desc(searchRuns.id)).offset((page - 1) * 10).limit(11);
}

export function runResults(runId: string) {
  return getDb().select({
    id: discoveryResults.id, name: discoveryResults.name, website: discoveryResults.website,
    district: discoveryResults.district, reference: discoveryResults.reference, duplicateId: companies.id,
    importedId: companySources.companyId, score: websiteReviews.score, qualified: websiteReviews.qualified,
    reviewedPresence: websiteReviews.presence,
  }).from(discoveryResults).innerJoin(searchRuns, eq(searchRuns.id, discoveryResults.runId))
    .leftJoin(companies, eq(companies.identityKey, discoveryResults.identityKey))
    .leftJoin(websiteReviews, eq(websiteReviews.resultId, discoveryResults.id))
    .leftJoin(companySources, and(eq(companySources.provider, "openstreetmap"), eq(companySources.reference, discoveryResults.reference)))
    .where(and(eq(discoveryResults.runId, runId), gt(searchRuns.expiresAt, new Date())))
    .orderBy(discoveryResults.name, discoveryResults.id).limit(50);
}
