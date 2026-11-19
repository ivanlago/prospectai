import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader, Pagination, pageNumber } from "@/components/controls";
import { DiscoveryForm } from "@/components/discovery-form";
import { OsmCredit } from "@/components/osm-credit";
import { DeleteForm } from "@/components/forms";
import { SearchEditor } from "@/components/search-editor";
import { getDb } from "@/db";
import { searches } from "@/db/schema";
import { formatDate, id, searchForm } from "@/domain";
import { discoveryNotices, getRuns } from "@/features/discovery";
import { discoverySources } from "@/integrations/discovery/registry";
import { removeSearch } from "../../actions";
import { cancelRun, runSearch } from "../discovery-actions";

export default async function EditSearch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ historico?: string; execucao?: string }> }) {
  await requireAdmin();
  const searchId = id.safeParse((await params).id).data;
  if (!searchId) notFound();
  const [row] = await getDb().select().from(searches).where(eq(searches.id, searchId));
  if (!row) notFound();
  const saved = searchForm.safeParse({ ...(row.config as object), name: row.name }).data;
  const query = await searchParams;
  const page = pageNumber(query.historico);
  const notice = typeof query.execucao === "string" && Object.hasOwn(discoveryNotices, query.execucao) ? discoveryNotices[query.execucao] : null;
  const runs = await getRuns(searchId, page);
  const labels = { running: "Em andamento", completed: "Concluída", failed: "Falhou", cancelled: "Cancelada" };
  const searchUrl = `/pesquisas/${row.id}`;
  const sources = saved ? discoverySources(saved) : [];
  return <><PageHeader title={row.name} description="Edite os critérios salvos para esta pesquisa." />
    <section className="panel padded stack">
      <h2>Descobrir empresas</h2>
      {notice && <p className="feedback" role="status">{notice}</p>}
      <p>Até 50 resultados por execução. O Overpass permite cinco chamadas a cada 24 horas. Os extratos municipais consultam dados locais.</p>
      <p>OpenStreetMap não oferece avaliações neste fluxo. O filtro de bairro depende do endereço disponível na fonte.</p>
      <OsmCredit />
      {sources.length ? <DiscoveryForm action={runSearch.bind(null, row.id)} sources={sources} /> :
        <p role="status">Nenhuma fonte habilitada para esta localização.</p>}
    </section>
    <section className="panel padded stack">
      <h2>Histórico de execuções</h2>
      {runs.length === 0 ? <Empty>Nenhuma execução registrada.</Empty> : <div className="table-scroll">
        <table><thead><tr><th>Execução</th><th>Situação</th><th>Resultados</th><th>Ações</th></tr></thead>
          <tbody>{runs.slice(0, 10).map(run => <tr key={run.id}>
            <td><Link href={`/pesquisas/execucoes/${run.id}`}>{formatDate(run.createdAt)}</Link></td>
            <td>{labels[run.status]}</td><td>{run.resultCount}</td>
            <td>{run.status === "running" && <form action={cancelRun.bind(null, run.id)}><button className="button danger">Cancelar</button></form>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <Pagination page={page} more={runs.length > 10} href={p => `${searchUrl}?historico=${p}`} />
    </section>
    <section className="panel padded stack"><SearchEditor saved={saved} id={row.id} />
      <DeleteForm action={removeSearch.bind(null, row.id)} label="Excluir pesquisa" /></section></>;
}
