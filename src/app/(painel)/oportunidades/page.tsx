import Link from "next/link";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader } from "@/components/controls";
import { StageForm } from "@/components/stage-form";
import { listCompanies, stageTotals } from "@/features/companies";
import { stageKeys, stageNames } from "@/domain";

export default async function Crm() {
  await requireAdmin();
  const [totals, ...columns] = await Promise.all([stageTotals(), ...stageKeys.map(stage => listCompanies("", stage, 1))] as const);
  return <>
    <PageHeader title="Oportunidades" description="Acompanhe as empresas em cada etapa do funil comercial." href="/empresas" action="Ver tabela" />
    <div className="board" tabIndex={0} aria-label="Funil comercial">{stageKeys.map((stage, index) => {
      const rows = columns[index];
      const total = totals.find(row => row.stage === stage)?.total ?? 0;
      return <section className="board-column" key={stage}>
        <header><h2>{stageNames[stage]}</h2><span className="pill">{total}</span></header>
        {rows.length === 0 && <Empty>Nenhuma empresa</Empty>}
        {rows.slice(0, 20).map(company => <article className="board-card" key={company.id}>
          <Link href={`/empresas/${company.id}`}>{company.name}</Link>
          <p>{company.segment} · {company.city}</p>
          <StageForm id={company.id} stage={stage} />
        </article>)}
        {total > 20 && <Link href={`/empresas?etapa=${stage}`}>Ver todas nesta etapa</Link>}
      </section>;
    })}</div>
  </>;
}
