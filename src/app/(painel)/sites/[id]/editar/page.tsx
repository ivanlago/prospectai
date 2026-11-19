import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SiteEditor } from "@/components/site-editor";
import { SiteAiAssistant } from "@/components/site-ai-assistant";
import { ActionForm } from "@/components/forms";
import { getDb } from "@/db";
import { websiteProjects } from "@/db/schema";
import { id } from "@/domain";
import { siteContent, templateId, toComposedSite } from "@/features/site-content";
import { latestRevision, revisionHistory } from "@/features/site-revisions";
import { persistRevision } from "./actions";
import { confirmEdit, requestEdit } from "./ai-actions";
import { siteAiProvider } from "@/integrations/ai/provider";
import { generationConfig } from "@/features/site-ai-usage";

export default async function EditSite({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ salva?: string; origem?: string }>;
}) {
  await requireAdmin();
  const projectId = id.safeParse((await params).id).data;
  if (!projectId) notFound();
  const db = getDb();
  const [project] = await db.select().from(websiteProjects).where(eq(websiteProjects.id, projectId));
  const template = templateId.safeParse(project?.template).data;
  if (project?.status !== "ready" || !template) notFound();
  const [[latest], history, query] = await Promise.all([latestRevision(db, projectId), revisionHistory(projectId), searchParams]);
  const content = siteContent.safeParse(latest?.content ?? project.content).data;
  if (!content) notFound();
  const revision = latest?.revision ?? 0;
  const document = toComposedSite(content);
  const adapter = generationConfig() ? siteAiProvider() : null;

  return <>
    <PageHeader title="Editor visual" description={content.name} href={`/sites/${projectId}`} action="Voltar à demonstração" />
    {revision > 0 && query.salva === String(revision) && <p className="feedback" role="status">Revisão {revision} salva.</p>}
    {revision > 0 && query.salva === String(revision) && query.origem === "ia" &&
      <ActionForm action={persistRevision.bind(null, projectId)} label="Desfazer alteração da IA">
        <input type="hidden" name="base" value={revision} />
        <input type="hidden" name="restore" value={revision - 1} />
      </ActionForm>}
    <SiteEditor key={revision} action={persistRevision.bind(null, projectId)} projectId={projectId}
      content={document} template={template} revision={revision}
      history={history.filter(entry => entry.revision <= revision).map(entry => ({ ...entry, createdAt: entry.createdAt.toISOString() }))} />
    {adapter && <SiteAiAssistant key={`ia-${revision}`} provider={adapter.label} content={document} template={template}
      request={requestEdit.bind(null, projectId, revision, adapter.id)} confirm={confirmEdit.bind(null, projectId)} />}
  </>;
}
