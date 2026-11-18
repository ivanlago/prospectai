import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { companies, websiteProjects } from "@/db/schema";
import { estimateMicros, gemini, reservedMicros } from "@/integrations/ai/gemini";
import { assembleSite, type generationForm } from "./site-content";

const limits = z.object({
  daily: z.coerce.number().int().min(1).max(100).default(5),
  budget: z.coerce.number().min(0).max(1000).default(5),
});

export function generationConfig() {
  return limits.safeParse({ daily: process.env.AI_DAILY_LIMIT || undefined, budget: process.env.AI_MONTHLY_BUDGET_USD || undefined }).data;
}

export const generationMessages: Record<string, string> = {
  disabled: "Configure a chave Gemini e os limites de geração no servidor.",
  missing: "Empresa indisponível.",
  daily: "Limite diário de tentativas já atingido.",
  budget: "Saldo mensal insuficiente para iniciar outra tentativa.",
  running: "Já existe uma geração em andamento.",
  quota: "O Gemini retornou um limite de uso. Confira a cota da conta.",
  auth: "O Gemini recusou a credencial configurada.",
  invalid: "O conteúdo retornado não passou pela validação.",
  provider: "A chamada ao Gemini falhou. Tente novamente mais tarde.",
  timeout: "A geração excedeu o tempo limite.",
  removed: "Empresa excluída.",
};

export function listSites() {
  return getDb().select({ id: websiteProjects.id, template: websiteProjects.template, status: websiteProjects.status,
    model: websiteProjects.model, createdAt: websiteProjects.createdAt, costMicros: websiteProjects.costMicros,
    company: companies.name, input: websiteProjects.inputTokens, output: websiteProjects.outputTokens })
    .from(websiteProjects).leftJoin(companies, eq(companies.id, websiteProjects.companyId))
    .orderBy(desc(websiteProjects.createdAt)).limit(50);
}

export async function generateSite(companyId: string, form: z.infer<typeof generationForm>) {
  const adapter = gemini();
  const config = generationConfig();
  if (!adapter || !config) return { error: "disabled" };
  const db = getDb();
  const prepared = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(7384503)`);
    const [company] = await tx.select({ name: companies.name, segment: companies.segment, city: companies.city, state: companies.state, address: companies.address })
      .from(companies).where(eq(companies.id, companyId)).for("key share");
    if (!company) return { error: "missing" };
    await tx.update(websiteProjects).set({ status: "failed", error: "timeout", finishedAt: new Date() })
      .where(and(eq(websiteProjects.status, "running"), sql`${websiteProjects.createdAt} < now() - interval '90 seconds'`));
    const [running] = await tx.select({ id: websiteProjects.id }).from(websiteProjects).where(eq(websiteProjects.status, "running")).limit(1);
    if (running) return { error: "running" };
    const [usage] = await tx.select({
      daily: sql<number>`count(*) filter (where ${websiteProjects.createdAt} >= date_trunc('day', now() at time zone 'America/Bahia') at time zone 'America/Bahia')::int`,
      monthly: sql<number>`coalesce(sum(${websiteProjects.costMicros}), 0)::int`,
    }).from(websiteProjects).where(sql`${websiteProjects.createdAt} >= date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia'`);
    if (usage.daily >= config.daily) return { error: "daily" };
    if (usage.monthly + reservedMicros > Math.floor(config.budget * 1000000)) return { error: "budget" };
    const [project] = await tx.insert(websiteProjects).values({ companyId, model: adapter.model, template: form.template, costMicros: reservedMicros })
      .returning({ id: websiteProjects.id });
    return { projectId: project.id, company };
  });
  if (!prepared.projectId || !prepared.company) return { error: prepared.error };
  const { projectId, company } = prepared;
  let response: Awaited<ReturnType<typeof adapter.generate>>;
  try {
    response = await adapter.generate({ name: company.name, segment: company.segment, services: form.serviceLines });
  } catch (error) {
    response = { error: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "provider" };
  }
  const costMicros = response.inputTokens === undefined || response.outputTokens === undefined
    ? reservedMicros : estimateMicros(response.inputTokens, response.outputTokens);
  const content = response.copy
    ? assembleSite({ ...company, address: form.includeAddress ? company.address : "", email: form.email, whatsapp: form.whatsapp }, form.serviceLines, response.copy) : null;
  await db.update(websiteProjects).set({
    status: content ? "ready" : "failed", content, costMicros, inputTokens: response.inputTokens,
    outputTokens: response.outputTokens, error: content ? null : response.error ?? "invalid", finishedAt: new Date(),
  }).where(and(eq(websiteProjects.id, projectId), eq(websiteProjects.status, "running")));
  return { projectId };
}
