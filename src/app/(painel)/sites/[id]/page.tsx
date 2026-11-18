import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SitePreview } from "@/components/site-preview";
import { ClinicPreview } from "@/components/clinic-preview";
import styles from "@/components/clinic-preview.module.css";
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

const layoutOptions = [
  { id: "clinica", label: "Clínica redesenhada" },
  { id: "anterior", label: "Layout original" },
  { id: "comparar", label: "Comparar layouts" },
] as const;

export default async function Site({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layout?: string }>;
}) {
  const project = await load((await params).id);
  const content = siteContent.safeParse(project.content).data;
  const template = templateId.safeParse(project.template).data;
  const requested = (await searchParams).layout;
  const layout = layoutOptions.find(option => option.id === requested)?.id ?? (template === "health" ? "clinica" : "anterior");
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 6 });
  return <>
    <PageHeader title="Demonstração" description={`${project.model} · estimativa ${money.format(project.costMicros / 1000000)}`} href="/sites" action="Ver histórico" />
    {project.status === "ready" && content && template ? <>
      <nav className="toolbar" aria-label="Escolher layout da demonstração">
        {layoutOptions.map(option => <Link key={option.id} href={`/sites/${project.id}?layout=${option.id}`}
          className={`button${layout === option.id ? " primary" : ""}`} aria-current={layout === option.id ? "page" : undefined}>
          {option.label}
        </Link>)}
      </nav>
      {layout === "comparar" ? <div className={styles.comparison}>
        <section aria-label="Layout original"><h2>Layout original</h2><SitePreview content={content} template={template} /></section>
        <section aria-label="Clínica redesenhada"><h2>Clínica redesenhada</h2><ClinicPreview content={content} /></section>
      </div> : layout === "clinica" ? <ClinicPreview content={content} /> : <SitePreview content={content} template={template} />}
    </> :
      <p className="feedback" role="status">{project.status === "running" ? "Geração em andamento." : generationMessages[project.error ?? "invalid"] ?? generationMessages.invalid}</p>}
  </>;
}
