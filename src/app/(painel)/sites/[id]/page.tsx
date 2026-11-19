import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { BeautyPreview } from "@/components/beauty-preview";
import { DentalPreview } from "@/components/dental-preview";
import { SitePreview } from "@/components/site-preview";
import { ClinicPreview } from "@/components/clinic-preview";
import { ComposedSitePreview } from "@/components/composed-site-preview";
import styles from "@/components/clinic-preview.module.css";
import { getDb } from "@/db";
import { websiteProjects } from "@/db/schema";
import { id } from "@/domain";
import { siteContent, templateId } from "@/features/site-content";
import { generationMessages } from "@/features/site-projects";
import { latestRevision } from "@/features/site-revisions";
import { cache } from "react";

const load = cache(async (rawId: string) => {
  await requireAdmin();
  const siteId = id.safeParse(rawId).data;
  if (!siteId) notFound();
  const db = getDb();
  const [project] = await db.select().from(websiteProjects).where(eq(websiteProjects.id, siteId));
  if (!project) notFound();
  const [latest] = project.status === "ready" ? await latestRevision(db, project.id) : [];
  return { ...project, content: latest?.content ?? project.content };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const project = await load((await params).id);
  const content = siteContent.safeParse(project.content).data;
  return { title: content?.seo.title ?? "Demonstração", description: content?.seo.description };
}

export default async function Site({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layout?: string }>;
}) {
  const project = await load((await params).id);
  const content = siteContent.safeParse(project.content).data;
  const template = templateId.safeParse(project.template).data;
  const requested = (await searchParams).layout;
  const alternative = template === "dental"
    ? { id: "odontologia", label: "Layout odontológico", Preview: DentalPreview }
    : template === "beauty"
    ? { id: "editorial", label: "Beleza editorial", Preview: BeautyPreview }
    : { id: "clinica", label: "Clínica redesenhada", Preview: ClinicPreview };
  const originalLabel = template === "dental" ? "Layout de clínicas" : "Layout original";
  const layoutOptions = [
    ...(content?.version === 1 ? [{ id: "composicao", label: "Prévia composta" }] : []),
    { id: "anterior", label: originalLabel },
    alternative,
    { id: "comparar", label: "Comparar layouts" },
  ];
  const layout = layoutOptions.find(option => option.id === requested)?.id
    ?? (content?.version === 1 ? "composicao" : template === "health" || template === "dental" ? alternative.id : "anterior");
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 6 });
  return <>
    <PageHeader title="Demonstração" description={`${project.model} · estimativa ${money.format(project.costMicros / 1000000)}`} href="/sites" action="Ver histórico" />
    {project.companyId && <div><Link href={`/empresas/${project.companyId}`}>Abrir empresa no CRM</Link></div>}
    {project.status === "ready" && content && template ? <>
      <nav className="toolbar" aria-label="Escolher layout da demonstração">
        {layoutOptions.map(option => <Link key={option.id} href={`/sites/${project.id}?layout=${option.id}`}
          className={`button${layout === option.id ? " primary" : ""}`} aria-current={layout === option.id ? "page" : undefined}>
          {option.label}
        </Link>)}
        <Link href={`/sites/${project.id}/editar`} className="button">Editar demonstração</Link>
        <Link href={`/sites/${project.id}/compartilhar`} className="button">Compartilhar demonstração</Link>
      </nav>
      {layout === "composicao" && content.version === 1 ? <>
        <ComposedSitePreview content={content} template={template} />
        <details className="panel padded">
          <summary>Sugestões de imagens da IA</summary>
          <p>{content.images.length ? content.images.join(", ") : "Nenhuma categoria sugerida."}</p>
        </details>
      </> : layout === "comparar" ? <div className={styles.comparison}>
        <section aria-label={originalLabel}><h2>{originalLabel}</h2>
          {template === "dental" ? <ClinicPreview content={content} /> : <SitePreview content={content} template={template} />}
        </section>
        <section aria-label={alternative.label}><h2>{alternative.label}</h2><alternative.Preview content={content} /></section>
      </div> : layout === alternative.id ? <alternative.Preview content={content} />
        : template === "dental" ? <ClinicPreview content={content} /> : <SitePreview content={content} template={template} />}
    </> :
      <p className="feedback" role="status">{project.status === "running" ? "Geração em andamento." : generationMessages[project.error ?? "invalid"] ?? generationMessages.invalid}</p>}
  </>;
}
