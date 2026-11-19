import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { companies, websiteProjects } from "@/db/schema";
import { siteAiProvider } from "@/integrations/ai/provider";
import { assembleSite, type generationForm } from "./site-content";
import { claimAiBudget, generationConfig } from "./site-ai-usage";
export { generationConfig } from "./site-ai-usage";

export const generationMessages: Record<string, string> = {
  disabled: "Configure a chave do provedor de IA e os limites de geração no servidor.",
  "provider-changed": "O provedor de IA mudou. Atualize a página e confirme o envio novamente.",
  missing: "Empresa indisponível.",
  daily: "Limite diário de tentativas já atingido.",
  budget: "Saldo mensal insuficiente para iniciar outra tentativa.",
  running: "Já existe uma solicitação de IA em andamento.",
  quota: "O provedor retornou um limite de uso. Confira a cota da conta.",
  auth: "O provedor recusou a credencial configurada.",
  invalid: "O conteúdo retornado não passou pela validação.",
  provider: "A chamada ao provedor de IA falhou. Tente novamente mais tarde.",
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

export async function generateSite(companyId: string, form: z.infer<typeof generationForm>, authorizedProvider: string, photo?: string) {
  const adapter = siteAiProvider();
  const config = generationConfig();
  if (!adapter || !config) return { error: "disabled" };
  if (adapter.id !== authorizedProvider) return { error: "provider-changed" };
  const { reservedMicros } = adapter;
  const db = getDb();
  const prepared = await db.transaction(async tx => {
    const [company] = await tx.select({ name: companies.name, segment: companies.segment, city: companies.city, state: companies.state, address: companies.address })
      .from(companies).where(eq(companies.id, companyId)).for("key share");
    if (!company) return { error: "missing" };
    const error = await claimAiBudget(tx, config, reservedMicros);
    if (error) return { error };
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
    ? reservedMicros : adapter.estimateMicros(response.inputTokens, response.outputTokens);
  const content = response.copy
    ? assembleSite({ ...company, address: form.includeAddress ? company.address : "", email: form.email, whatsapp: form.whatsapp, photo }, form.serviceLines, form.benefitLines, response.copy) : undefined;
  await db.update(websiteProjects).set({
    status: content ? "ready" : "failed", content: content ?? null, costMicros, inputTokens: response.inputTokens,
    outputTokens: response.outputTokens, error: content ? null : response.error ?? "invalid", finishedAt: new Date(),
  }).where(and(eq(websiteProjects.id, projectId), eq(websiteProjects.status, "running")));
  return { projectId };
}
