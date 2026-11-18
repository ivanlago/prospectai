import Link from "next/link";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader, Pagination, pageNumber } from "@/components/controls";
import { formatDate, stageNames, stages } from "@/domain";
import { companyPageSize, listCompanies } from "@/features/companies";

export default async function Companies({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const stage = stages.safeParse(params.etapa).data;
  const page = pageNumber(params.pagina);
  const rows = await listCompanies(q, stage, page);
  const link = (p: number) => `/empresas?${new URLSearchParams({ q, etapa: stage ?? "", pagina: String(p) })}`;

  return <>
    <PageHeader title="Empresas" description="Consulte e atualize os cadastros do seu CRM." href="/empresas/nova" action="Nova empresa" />
    {params.excluida === "1" && <p role="status" className="feedback">Empresa excluída.</p>}
    <section className="panel">
      <form className="toolbar">
        <input aria-label="Buscar empresas" name="q" defaultValue={q} placeholder="Nome, cidade ou segmento" maxLength={160} />
        <select name="etapa" aria-label="Filtrar por etapa" defaultValue={stage ?? ""}>
          <option value="">Todas as etapas</option>
          {Object.entries(stageNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select>
        <button className="button">Filtrar</button>
      </form>
      {rows.length === 0 ? <Empty>Nenhuma empresa encontrada.</Empty> :
        <div className="table-scroll"><table><thead><tr><th>Empresa</th><th>Segmento</th><th>Localização</th><th>Etapa</th><th>Cadastro</th></tr></thead>
          <tbody>{rows.slice(0, companyPageSize).map(row => <tr key={row.id}>
            <td><Link href={`/empresas/${row.id}`}>{row.name}</Link></td><td>{row.segment}</td>
            <td>{row.city}, {row.state}</td><td><span className="pill">{stageNames[row.stage]}</span></td><td>{formatDate(row.createdAt)}</td>
          </tr>)}</tbody>
        </table></div>}
      <Pagination page={page} more={rows.length > companyPageSize} href={link} />
    </section>
  </>;
}
