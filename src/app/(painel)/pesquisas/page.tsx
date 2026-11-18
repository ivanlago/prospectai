import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { getDb } from "@/db";
import { searches } from "@/db/schema";
import { Empty, PageHeader, Pagination, pageNumber } from "@/components/controls";
import { formatDate, searchForm } from "@/domain";

export default async function Searches({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const args = await searchParams;
  const page = pageNumber(args.pagina);
  const rows = await getDb().select().from(searches).orderBy(desc(searches.createdAt), desc(searches.id)).limit(21).offset(20 * (page - 1));
  return <>
    <PageHeader title="Pesquisas" description="Salve critérios de região e segmento para futuras execuções." href="/pesquisas/nova" action="Nova pesquisa" />
    {(args.salva === "1" || args.excluida === "1") && <p className="feedback" role="status">{args.salva === "1" ? "Pesquisa salva." : "Pesquisa excluída."}</p>}
    <section className="panel">
      {rows.length === 0 ? <Empty>Nenhuma pesquisa cadastrada.</Empty> :
        <div className="table-scroll"><table><thead><tr><th>Pesquisa</th><th>Localização</th><th>Segmento</th><th>Atualização</th></tr></thead>
          <tbody>{rows.slice(0, 20).map(row => {
            const config = searchForm.safeParse({ ...(row.config as object), name: row.name }).data;
            return <tr key={row.id}><td><Link href={`/pesquisas/${row.id}`}>{row.name}</Link></td>
              <td>{config?.city ?? "—"}</td><td>{config?.segment ?? "—"}</td><td>{formatDate(row.updatedAt)}</td></tr>;
          })}</tbody></table></div>}
      <Pagination page={page} more={rows.length > 20} href={p => `/pesquisas?pagina=${p}`} />
    </section>
  </>;
}
