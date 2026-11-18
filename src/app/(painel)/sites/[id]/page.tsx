import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SitePreview } from "@/components/site-preview";
import { getDb } from "@/db";
import { websiteProjects } from "@/db/schema";
import { id } from "@/domain";
import { siteContent, templateId } from "@/features/site-content";
import { generationMessages } from "@/features/site-projects";
import { cache } from "react";

const load = cache(async (rawId: string) => {
  await requireAdmin();
  const siteId = id.safeParse(rawId).data;
  if (!siteId) notFound();
  const [project] = await getDb().select().from(websiteProjects).where(eq(websiteProjects.id, siteId));
  if (!project) notFound();
  return project;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const project = await load((await params).id);
  const content = siteContent.safeParse(project.content).data;
  return { title: content?.seo.title ?? "Demonstração", description: content?.seo.description };
}

export default async function Site({ params }: { params: Promise<{ id: string }> }) {
  const project = await load((await params).id);
  const content = siteContent.safeParse(project.content).data;
  const template = templateId.safeParse(project.template).data;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 6 });
  return <>
    <PageHeader title="Demonstração" description={`${project.model} · estimativa ${money.format(project.costMicros / 1000000)}`} href="/sites" action="Ver histórico" />
    {project.status === "ready" && content && template ? <SitePreview content={content} template={template} /> :
      <p className="feedback" role="status">{project.status === "running" ? "Geração em andamento." : generationMessages[project.error ?? "invalid"] ?? generationMessages.invalid}</p>}
  </>;
}
