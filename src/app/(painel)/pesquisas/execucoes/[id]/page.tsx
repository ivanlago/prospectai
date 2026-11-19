import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader, Pagination, pageNumber } from "@/components/controls";
import { OsmCredit } from "@/components/osm-credit";
import { ActionForm } from "@/components/forms";
import { DiscoveryResults } from "@/components/discovery-results";
import { getDb } from "@/db";
import { searchRuns } from "@/db/schema";
import { id } from "@/domain";
import { discoveryNotices, runResults } from "@/features/discovery";
import { digitalPresence, resultFilters, resultPresence } from "@/features/discovery-results";
import { categoryOptions, normalize, osmFilters } from "@/integrations/discovery/overpass";
import { extractMunicipality, extractProvider } from "@/integrations/discovery/municipal-extract";
import { cancelRun, repeatRun } from "../../discovery-actions";

export const dynamic = "force-dynamic";

export default async function RunPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const runId = id.safeParse((await params).id).data;
  if (!runId) notFound();
  const [run] = await getDb().select({ run: searchRuns, expired: sql<boolean>`${searchRuns.expiresAt} <= now()` })
    .from(searchRuns).where(eq(searchRuns.id, runId));
  if (!run) notFound();
  const { run: execution, expired } = run;
  const query = await searchParams;
  const page = pageNumber(typeof query.pagina === "string" ? query.pagina : undefined);
  const view = resultFilters.parse(query);
  const rows = !expired && execution.status === "completed" ? await runResults(runId) : [];
  const filters = osmFilters.safeParse(execution.filters).data;
  const isExtract = execution.provider === extractProvider.id;
  const municipality = filters && extractMunicipality(filters);
  const metadata = z.object({ snapshotDate: z.iso.date().optional(), consultedAt: z.iso.datetime().optional() }).safeParse(execution.filters).data;
  const snapshot = metadata?.snapshotDate;
  const consultedAt = metadata?.consultedAt ? new Date(metadata.consultedAt) : execution.createdAt;
  const category = categoryOptions.find(item => item.value === filters?.category)?.label ?? "Segmento indisponível";
  const city = filters?.city ?? "Localização indisponível";
  const source = isExtract ? "Geofabrik · OpenStreetMap" : "Overpass · OpenStreetMap";
  const base = `/pesquisas/execucoes/${runId}`;
  const filtered = rows.filter(row =>
    (!view.presenca || digitalPresence(row.website, row.reviewedPresence) === view.presenca) &&
    (!view.segmento || normalize(category).includes(normalize(view.segmento))) &&
    (!view.bairro || normalize(`${row.district} ${city} ${filters?.state ?? ""}`).includes(normalize(view.bairro))) &&
    (!view.revisao || (view.revisao === "pendente" ? row.score === null
      : view.revisao === "qualificada" ? row.qualified : row.score !== null && !row.qualified)),
  );
  filtered.sort((a, b) => {
    switch (view.ordem) {
      case "score": return (b.score ?? -1) - (a.score ?? -1);
      case "bairro": return a.district.localeCompare(b.district, "pt-BR");
      case "presenca": return resultPresence[digitalPresence(a.website, a.reviewedPresence)]
        .localeCompare(resultPresence[digitalPresence(b.website, b.reviewedPresence)], "pt-BR");
      case "revisao": return Number(b.score !== null) - Number(a.score !== null);
      default: return 0;
    }
  });
  const labels = { running: "Em andamento", completed: "Concluída", failed: "Falhou", cancelled: "Cancelada" };
  return <>
    <PageHeader title="Resultados da pesquisa" description={filters ? `${category} · ${filters.city}, ${filters.state}` : "OpenStreetMap"}
      href={execution.searchId ? `/pesquisas/${execution.searchId}` : "/pesquisas"} action="Voltar às pesquisas" />
    <section className="panel padded stack">
      <p><strong>{labels[execution.status]}</strong> · Consulta em <time dateTime={consultedAt.toISOString()}>
        {consultedAt.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}
      </time> · {execution.resultCount} resultado(s)</p>
      <p>{source}. Endereço, site e demais informações dependem da cobertura da fonte.</p>
      {metadata?.consultedAt && <p role="status">Resultados reutilizados de uma consulta recente. Revise cada oportunidade antes de importar.</p>}
      {isExtract && <p>Extrato Geofabrik{municipality ? ` de ${municipality.name}` : ""}{snapshot ? ` · versão de ${snapshot.split("-").reverse().join("/")}` : ""}. Cobertura limitada a estabelecimentos mapeados como pontos.</p>}
      <OsmCredit />
      {execution.status === "running" && <div className="toolbar">
        <Link href={`/pesquisas/execucoes/${runId}`} className="button">Atualizar</Link>
        <form action={cancelRun.bind(null, runId)}><button className="button danger">Cancelar execução</button></form>
      </div>}
      {execution.error && <p role="status" className="feedback">{discoveryNotices[execution.error] ?? discoveryNotices.invalid}</p>}
      {execution.truncated && <p role="status">A consulta alcançou o limite de leitura ou de exibição. Outros resultados podem existir.</p>}
      {rows.length > 0 && <p>{rows.filter(row => !row.website).length} sem URL disponível · {rows.filter(row => !row.district).length} sem bairro informado</p>}
      {execution.searchId && execution.status !== "running" &&
        <ActionForm label="Reexecutar consulta" action={repeatRun.bind(null, runId)}>{null}</ActionForm>}
    </section>
    {execution.status === "completed" && (expired ? <Empty>Os resultados dessa execução expiraram.</Empty> :
      <section className="stack" aria-label="Empresas encontradas">
        <form className="panel padded toolbar discovery-filters">
          <input type="hidden" name="visualizacao" value={view.visualizacao} />
          <label>Presença digital<select name="presenca" defaultValue={view.presenca}><option value="">Todas</option>
            {Object.entries(resultPresence).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Revisão<select name="revisao" defaultValue={view.revisao}><option value="">Todas</option>
            <option value="pendente">Pendente</option><option value="revisada">Revisada</option><option value="qualificada">Qualificada</option></select></label>
          <label>Segmento<select name="segmento" defaultValue={view.segmento}><option value="">Todos</option><option value={category}>{category}</option></select></label>
          <label>Localização<input name="bairro" maxLength={160} defaultValue={view.bairro} /></label>
          <label>Ordenar por<select name="ordem" defaultValue={view.ordem}><option value="nome">Nome</option>
            <option value="score">Maior score</option><option value="bairro">Bairro</option><option value="presenca">Presença digital</option>
            <option value="revisao">Revisados primeiro</option></select></label>
          <button className="button">Aplicar filtros</button>
        </form>
        <div className="section-header">
          <p>{filtered.length} de {rows.length} empresas</p>
          <nav aria-label="Visualização de resultados" className="toolbar">
            <Link className={`button ${view.visualizacao === "cards" ? "primary" : ""}`} aria-current={view.visualizacao === "cards" ? "true" : undefined}
              href={`${base}?${new URLSearchParams({ ...view, visualizacao: "cards" })}`}>Cards</Link>
            <Link className={`button ${view.visualizacao === "tabela" ? "primary" : ""}`} aria-current={view.visualizacao === "tabela" ? "true" : undefined}
              href={`${base}?${new URLSearchParams({ ...view, visualizacao: "tabela" })}`}>Tabela</Link>
          </nav>
        </div>
        {filtered.length > (page - 1) * 20 ?
          <DiscoveryResults key={`${runId}:${page}:${new URLSearchParams(view)}`}
            rows={filtered.slice((page - 1) * 20, page * 20)} table={view.visualizacao === "tabela"} segment={category} city={city} source={source} /> :
          <Empty>Nenhuma empresa encontrada nesta página.</Empty>}
        <Pagination page={page} more={filtered.length > page * 20}
          href={p => `${base}?${new URLSearchParams({ ...view, pagina: String(p) })}`} />
      </section>)}
  </>;
}
