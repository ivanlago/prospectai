import { and, eq, gt, isNotNull, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { websiteEditAttempts, websiteProjects } from "@/db/schema";
import { siteAiProvider } from "@/integrations/ai/provider";
import { claimAiBudget, generationConfig } from "./site-ai-usage";
import { defaultEditor, siteContent, templateId, toComposedSite } from "./site-content";
import { applyOperations, editProposal } from "./site-edit-operations";
import { latestRevision, saveRevision } from "./site-revisions";

const expiryMs = 60 * 60 * 1000;

export async function proposeSiteEdit(projectId: string, actorId: string, base: number, instruction: string, authorizedProvider: string) {
  const adapter = siteAiProvider();
  const config = generationConfig();
  if (!adapter || !config) return { error: "disabled" };
  if (adapter.id !== authorizedProvider) return { error: "provider-changed" };
  const db = getDb();
  const prepared = await db.transaction(async tx => {
    const [project] = await tx.select().from(websiteProjects).where(eq(websiteProjects.id, projectId));
    const template = templateId.safeParse(project?.template).data;
    if (project?.status !== "ready" || !template) return { error: "missing" };
    const [latest] = await latestRevision(tx, projectId);
    if ((latest?.revision ?? 0) !== base) return { error: "stale" };
    const saved = siteContent.safeParse(latest?.content ?? project.content).data;
    if (!saved) return { error: "invalid" };
    const error = await claimAiBudget(tx, config, adapter.reservedMicros);
    if (error) return { error };
    await tx.update(websiteEditAttempts).set({ operations: null })
      .where(and(isNotNull(websiteEditAttempts.operations), lt(websiteEditAttempts.createdAt, new Date(Date.now() - expiryMs))));
    const [attempt] = await tx.insert(websiteEditAttempts).values({
      projectId, actorId, baseRevision: base, model: adapter.model, costMicros: adapter.reservedMicros,
    }).returning({ id: websiteEditAttempts.id });
    return { attempt, content: toComposedSite(saved), template };
  });
  if (!prepared.attempt || !prepared.content || !prepared.template) return { error: prepared.error };
  const { content, template, attempt } = prepared;
  const editor = content.editor ?? defaultEditor(content, template);
  let result: Awaited<ReturnType<typeof adapter.edit>>;
  try {
    result = await adapter.edit({ instruction, site: {
      template, segment: content.segment, serviceCount: content.services.length,
      copy: content.copy, valueProposition: content.valueProposition,
      palette: editor.palette, font: editor.font, spacing: editor.spacing,
      servicesVisible: content.services.length > 0 && !editor.hidden.includes("servicos"),
    } });
  } catch (error) {
    result = { error: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "provider" };
  }
  const proposal = result.proposal;
  const next = proposal && applyOperations(content, template, proposal);
  const hasChanges = next && proposal?.operations.length;
  const error = hasChanges ? null : result.error ?? (next ? "empty" : "invalid");
  const costMicros = result.inputTokens === undefined || result.outputTokens === undefined ? adapter.reservedMicros
    : adapter.estimateMicros(result.inputTokens, result.outputTokens);
  const [updated] = await db.update(websiteEditAttempts).set({
    status: hasChanges ? "ready" : "failed", operations: hasChanges ? proposal : null, error,
    inputTokens: result.inputTokens, outputTokens: result.outputTokens, costMicros, finishedAt: new Date(),
  }).where(and(eq(websiteEditAttempts.id, attempt.id), eq(websiteEditAttempts.status, "running")))
    .returning({ id: websiteEditAttempts.id });
  return updated && hasChanges && proposal ? { attemptId: attempt.id, proposal, costMicros,
    inputTokens: result.inputTokens, outputTokens: result.outputTokens } : { error: error ?? "timeout" };
}

export async function applySiteEdit(projectId: string, actorId: string, attemptId: string) {
  const db = getDb();
  const [attempt] = await db.select().from(websiteEditAttempts).where(and(
    eq(websiteEditAttempts.id, attemptId), eq(websiteEditAttempts.projectId, projectId),
    eq(websiteEditAttempts.actorId, actorId), eq(websiteEditAttempts.status, "ready"),
    gt(websiteEditAttempts.createdAt, new Date(Date.now() - expiryMs)),
  ));
  const proposal = editProposal.safeParse(attempt?.operations).data;
  if (!attempt || !proposal?.operations.length) return { error: "Proposta indisponível ou expirada." };
  const [project] = await db.select({ template: websiteProjects.template }).from(websiteProjects).where(eq(websiteProjects.id, projectId));
  const template = templateId.safeParse(project?.template).data;
  if (!template) return { error: "Demonstração indisponível." };
  return saveRevision(projectId, actorId, attempt.baseRevision, { edit: content => applyOperations(content, template, proposal) });
}
