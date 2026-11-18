import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader, Empty } from "@/components/controls";
import { CompanyForm } from "@/components/company-form";
import { ActionForm, DeleteForm } from "@/components/forms";
import { StageForm } from "@/components/stage-form";
import { formatDate, id, stageNames, stages } from "@/domain";
import { companyActivity, getCompany } from "@/features/companies";
import { removeCompany, saveNote } from "../../actions";

export default async function EditCompany({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }>;
}) {
  await requireAdmin();
  const companyId = id.safeParse((await params).id).data;
  if (!companyId) notFound();
  const company = await getCompany(companyId);
  if (!company) notFound();
  const history = await companyActivity(company.id);
  const saved = (await searchParams).salvo === "1";

  return <>
    <PageHeader title={company.name} description={`${company.segment} · ${company.city}, ${company.state}`} />
    {saved && <p className="feedback" role="status">Empresa salva.</p>}
    <div className="detail-grid">
      <section className="panel padded stack"><h2>Cadastro</h2><CompanyForm company={company} />
        <DeleteForm action={removeCompany.bind(null, company.id)} label="Excluir empresa" />
      </section>
      <section className="panel padded stack"><h2>CRM</h2>
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
  </>;
}
