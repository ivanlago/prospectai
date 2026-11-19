import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { PageHeader, Empty } from "@/components/controls";
import { CompanyForm } from "@/components/company-form";
import { CompanyDemonstrations } from "@/components/company-demonstrations";
import { ActionForm, DeleteForm } from "@/components/forms";
import { StageForm } from "@/components/stage-form";
import { OsmCredit } from "@/components/osm-credit";
import { presenceLabels } from "@/features/qualification";
import { companyOrigins } from "@/features/reviews";
import { formatDate, id, stageNames, stages } from "@/domain";
import { companyActivity, getCompany } from "@/features/companies";
import { companyDemonstrations } from "@/features/company-demonstrations";
import { removeCompany, saveNote } from "../../actions";

export default async function EditCompany({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }>;
}) {
  await requireAdmin();
  const companyId = id.safeParse((await params).id).data;
  if (!companyId) notFound();
  const company = await getCompany(companyId);
  if (!company) notFound();
  const [history, sources, demos] = await Promise.all([companyActivity(company.id),
    companyOrigins(company.id),
    companyDemonstrations(company.id),
  ]);
  const reviewSchema = z.object({ score: z.number(), evidence: z.string(), reviewedAt: z.iso.datetime().optional(), consultedAt: z.iso.datetime().optional(),
    provider: z.string().optional(),
    presence: z.custom<keyof typeof presenceLabels>(value => typeof value === "string" && Object.hasOwn(presenceLabels, value)),
  });
  const saved = (await searchParams).salvo === "1";

  return <>
    <PageHeader title={company.name} description={`${company.segment} · ${company.city}, ${company.state}`} />
    {saved && <p className="feedback" role="status">Empresa salva.</p>}
    <div className="detail-grid">
      <section className="panel padded stack"><h2>Cadastro</h2><CompanyForm company={company} />
        <DeleteForm action={removeCompany.bind(null, company.id)} label="Excluir empresa" />
      </section>
      <section className="panel padded stack"><h2>CRM</h2>
        <div><Link className="button primary" href={`/sites/novo/${company.id}`}>Gerar demonstração de site</Link></div>
        <StageForm id={company.id} stage={company.stage} />
        <ActionForm action={saveNote.bind(null, company.id)} label="Adicionar nota">
          <label>Nova nota<textarea name="note" rows={3} required maxLength={4000} /></label>
        </ActionForm>
        <h3>Atividade recente</h3>
        {history.length === 0 ? <Empty>Nenhuma atividade.</Empty> : <ul className="history">
          {history.map(item => {
            const [from, to] = item.detail.split(":").map(value => stages.safeParse(value).data);
            return <li key={item.id}><time dateTime={item.createdAt.toISOString()}>{formatDate(item.createdAt)}</time>
              <p>{item.type === "crm.moved" && from && to ? `${stageNames[from]} → ${stageNames[to]}` : item.detail}</p>
            </li>;
          })}
        </ul>}
      </section>
    </div>
    <CompanyDemonstrations {...demos} />
    {sources.length > 0 && <section className="panel padded stack" aria-labelledby="company-origins">
      <h2 id="company-origins">Origem e evidências</h2>
      <OsmCredit />
      <ul className="history">{sources.map(source => {
        const review = reviewSchema.safeParse(source.review).data;
        return <li key={source.id}>
          <p><a href={`https://www.openstreetmap.org/${source.reference}`} target="_blank" rel="noreferrer">Registro de origem</a>
            {" · "}{source.permission} · {formatDate(review?.reviewedAt ? new Date(review.reviewedAt) : source.reviewedAt)}</p>
          {review?.provider && <p>{review.provider === "openstreetmap-geofabrik" ? "Extrato municipal · Geofabrik" : "OpenStreetMap · Overpass"}
            {review.consultedAt && ` · Consulta em ${formatDate(new Date(review.consultedAt))}`}</p>}
          {review && <><p>{presenceLabels[review.presence]} · {review.score}/100</p><p>{review.evidence}</p></>}
        </li>;
      })}</ul>
    </section>}
  </>;
}
