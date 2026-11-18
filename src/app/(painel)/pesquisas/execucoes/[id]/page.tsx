import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader, Pagination, pageNumber } from "@/components/controls";
import { OsmCredit } from "@/components/osm-credit";
import { getDb } from "@/db";
import { searchRuns } from "@/db/schema";
import { formatDate, id } from "@/domain";
import { discoveryNotices, runResults } from "@/features/discovery";
import { categoryOptions, osmFilters } from "@/integrations/discovery/overpass";
import { cancelRun } from "../../discovery-actions";

export const dynamic = "force-dynamic";

export default async function RunPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }>;
}) {
  await requireAdmin();
  const runId = id.safeParse((await params).id).data;
  if (!runId) notFound();
  const [run] = await getDb().select({ run: searchRuns, expired: sql<boolean>`${searchRuns.expiresAt} <= now()` })
    .from(searchRuns).where(eq(searchRuns.id, runId));
  if (!run) notFound();
  const { run: execution, expired } = run;
  const page = pageNumber((await searchParams).pagina);
  const rows = await runResults(runId, page);
  const filters = osmFilters.safeParse(execution.filters).data;
  const category = categoryOptions.find(item => item.value === filters?.category)?.label;
  const labels = { running: "Em andamento", completed: "Concluída", failed: "Falhou", cancelled: "Cancelada" };
  return <>
    <PageHeader title="Resultados da pesquisa" description={filters ? `${category} · ${filters.city}, ${filters.state}` : "OpenStreetMap"}
      href={execution.searchId ? `/pesquisas/${execution.searchId}` : "/pesquisas"} action="Voltar às pesquisas" />
    <section className="panel padded stack">
      <p><strong>{labels[execution.status]}</strong> · {formatDate(execution.createdAt)} · {execution.resultCount} resultado(s)</p>
      <p>Os resultados são descobertas do OpenStreetMap. A coluna de site indica a informação disponível na fonte.</p>
      <OsmCredit />
      {execution.status === "running" && <div className="toolbar">
        <Link href={`/pesquisas/execucoes/${runId}`} className="button">Atualizar</Link>
        <form action={cancelRun.bind(null, runId)}><button className="button danger">Cancelar execução</button></form>
      </div>}
      {execution.error && <p role="status" className="feedback">{discoveryNotices[execution.error] ?? discoveryNotices.invalid}</p>}
      {execution.truncated && <p role="status">A consulta alcançou o limite de leitura ou de exibição. Outros resultados podem existir.</p>}
      {execution.status === "completed" && (expired ? <Empty>Os resultados dessa execução expiraram.</Empty> : rows.length === 0 ?
        <Empty>Nenhuma empresa encontrada nesta página.</Empty> : <div className="table-scroll">
          <table><thead><tr><th>Empresa</th><th>Bairro</th><th>Site na fonte</th><th>CRM</th><th>Origem</th></tr></thead>
            <tbody>{rows.slice(0, 20).map(row => <tr key={row.id}>
              <td>{row.name}</td><td>{row.district || "—"}</td><td>{row.website || "Sem URL disponível"}</td>
              <td>{row.duplicateId ? <Link href={`/empresas/${row.duplicateId}`}>Possível duplicidade</Link> : "—"}</td>
              <td><a href={`https://www.openstreetmap.org/${row.reference}`} target="_blank" rel="noreferrer">{row.reference}</a></td>
            </tr>)}</tbody>
          </table>
        </div>)}
      {!expired && execution.status === "completed" && <Pagination page={page} more={rows.length > 20} href={p => `/pesquisas/execucoes/${runId}?pagina=${p}`} />}
    </section>
  </>;
}
