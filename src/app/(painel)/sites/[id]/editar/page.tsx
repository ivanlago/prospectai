import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SiteEditor } from "@/components/site-editor";
import { getDb } from "@/db";
import { websiteProjects } from "@/db/schema";
import { id } from "@/domain";
import { siteContent, templateId, toComposedSite } from "@/features/site-content";
import { latestRevision, revisionHistory } from "@/features/site-revisions";
import { persistRevision } from "./actions";

export default async function EditSite({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ salva?: string }>;
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

  return <>
    <PageHeader title="Editor visual" description={content.name} href={`/sites/${projectId}`} action="Voltar à demonstração" />
    {revision > 0 && query.salva === String(revision) && <p className="feedback" role="status">Revisão {revision} salva.</p>}
    <SiteEditor key={revision} action={persistRevision.bind(null, projectId)} projectId={projectId}
      content={toComposedSite(content)} template={template} revision={revision}
      history={history.filter(entry => entry.revision <= revision).map(entry => ({ ...entry, createdAt: entry.createdAt.toISOString() }))} />
  </>;
}
