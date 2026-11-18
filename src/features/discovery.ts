import { and, count, desc, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, discoveryResults, searchRuns, searches } from "@/db/schema";
import { searchForm } from "@/domain";
import { osmEnabled, osmFilters, osmProvider, normalize, ProviderError } from "@/integrations/discovery/overpass";

const lifetime = 7 * 86400000;
const dailyLimit = 5;
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
};

export async function executeDiscovery(searchId: string, category: FormDataEntryValue | null) {
  if (!osmEnabled()) return { error: "disabled" };
  const db = getDb();
  const [search] = await db.select().from(searches).where(eq(searches.id, searchId));
  if (!search) return { error: "missing" };
  const saved = searchForm.safeParse({ ...(search.config as object), name: search.name }).data;
  if (!saved) return { error: "filters" };
  if (!["brasil", "br"].includes(normalize(saved.country)) || saved.rating !== null || saved.reviews !== null || saved.radius !== null || saved.limit > 50) {
    return { error: "unsupported" };
  }
  const parsed = osmFilters.safeParse({ ...saved, category });
  if (!parsed.success) return { error: "filters" };
  const filters = parsed.data;
  const reserved = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(7384502)`);
    const stale = new Date(Date.now() - runningTimeout);
    await tx.update(searchRuns).set({ status: "failed", error: "timeout", finishedAt: new Date() })
      .where(and(eq(searchRuns.status, "running"), lt(searchRuns.createdAt, stale)));
    const [running] = await tx.select({ id: searchRuns.id }).from(searchRuns).where(eq(searchRuns.status, "running")).limit(1);
    if (running) return { error: "running" };
    const [recent] = await tx.select({ id: searchRuns.id }).from(searchRuns).where(
      and(eq(searchRuns.provider, osmProvider.id), gt(searchRuns.createdAt, new Date(Date.now() - 60000))),
    ).limit(1);
    if (recent) return { error: "cooldown" };
    const [used] = await tx.select({ total: count() }).from(searchRuns).where(
      and(eq(searchRuns.provider, osmProvider.id), gt(searchRuns.createdAt, new Date(Date.now() - 86400000))),
    );
    if (used.total >= dailyLimit) return { error: "daily" };
    await tx.delete(discoveryResults).where(sql`${discoveryResults.runId} in (
      select ${searchRuns.id} from ${searchRuns} where ${searchRuns.expiresAt} <= now()
    )`);
    const [run] = await tx.insert(searchRuns).values({
      searchId, provider: osmProvider.id, filters, expiresAt: new Date(Date.now() + lifetime),
    }).returning({ id: searchRuns.id });
    return { id: run.id };
  });
  if (!reserved.id) return { error: reserved.error };
  const runId = reserved.id;
  const controller = new AbortController();
  active.set(runId, controller);
  try {
    const { results, truncated } = await osmProvider.search(filters, controller.signal);
    await db.transaction(async tx => {
      const [updated] = await tx.update(searchRuns).set({
        status: "completed", finishedAt: new Date(), resultCount: results.length, truncated,
      }).where(and(eq(searchRuns.id, runId), eq(searchRuns.status, "running"))).returning({ id: searchRuns.id });
      if (updated && results.length) await tx.insert(discoveryResults).values(results.map(result => ({ ...result, runId })));
    });
  } catch (error) {
    let code = "invalid";
    if (error instanceof ProviderError && ["busy", "upstream", "partial"].includes(error.code)) code = error.code;
    else if (error instanceof Error && error.name === "TimeoutError") code = "timeout";
    await db.update(searchRuns).set({ status: "failed", finishedAt: new Date(), error: code })
      .where(and(eq(searchRuns.id, runId), eq(searchRuns.status, "running")));
    if (!controller.signal.aborted) console.warn({ event: "discovery.failed", provider: osmProvider.id, code, runId });
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

export function runResults(runId: string, page: number) {
  return getDb().select({
    id: discoveryResults.id, name: discoveryResults.name, website: discoveryResults.website,
    district: discoveryResults.district, reference: discoveryResults.reference, duplicateId: companies.id,
  }).from(discoveryResults).innerJoin(searchRuns, eq(searchRuns.id, discoveryResults.runId))
    .leftJoin(companies, eq(companies.identityKey, discoveryResults.identityKey))
    .where(and(eq(discoveryResults.runId, runId), gt(searchRuns.expiresAt, new Date())))
    .orderBy(discoveryResults.name, discoveryResults.id).offset((page - 1) * 20).limit(21);
}
