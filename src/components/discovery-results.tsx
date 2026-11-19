"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { resultPresence, digitalPresence } from "@/features/discovery-results";
import type { runResults } from "@/features/discovery";

type Row = Awaited<ReturnType<typeof runResults>>[number];
const subscribe = () => () => {};

function ReviewLink({ row }: { row: Row }) {
  return <Link href={`/pesquisas/revisao/${row.id}`}>
    {row.score === null ? "Revisar" : `${row.qualified ? "Qualificada" : "Revisada"} · ${row.score}/100`}
  </Link>;
}

function CrmLink({ row }: { row: Row }) {
  const id = row.importedId ?? row.duplicateId;
  return id ? <Link href={`/empresas/${id}`}>{row.importedId ? "Importada" : "Possível duplicidade"}</Link> : null;
}

function SourceLink({ row, source }: { row: Row; source: string }) {
  return <a href={`https://www.openstreetmap.org/${row.reference}`} target="_blank" rel="noreferrer">
    {source} <ArrowUpRight size={13} aria-hidden="true" />
  </a>;
}

export function DiscoveryResults({ rows, table, segment, city, source }: {
  rows: Row[]; table: boolean; segment: string; city: string; source: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const displayed = selectedOnly ? rows.filter(row => selected.includes(row.id)) : rows;
  const checkbox = (row: Row) => <input type="checkbox" aria-label={`Selecionar ${row.name}`}
    disabled={!hydrated} checked={selected.includes(row.id)} onChange={event => {
      const checked = event.target.checked;
      setSelected(current => checked ? [...current, row.id] : current.filter(id => id !== row.id));
      if (!checked && selected.length === 1) setSelectedOnly(false);
    }} />;

  return <>
    <div className="toolbar discovery-selection">
      <span role="status">{selected.length} selecionada(s) nesta página</span>
      <button type="button" className="button" disabled={!selected.length} aria-pressed={selectedOnly}
        onClick={() => setSelectedOnly(!selectedOnly)}>Mostrar somente selecionadas</button>
      <button type="button" className="button" disabled={!selected.length} onClick={() => {
        setSelected([]);
        setSelectedOnly(false);
      }}>Limpar seleção</button>
    </div>
    {table ? <div className="table-scroll">
    <table><thead><tr><th>Seleção</th><th>Empresa</th><th>Segmento</th><th>Localização</th><th>Presença digital</th><th>Site na fonte</th><th>Revisão</th><th>CRM</th><th>Origem</th></tr></thead>
      <tbody>{displayed.map(row => <tr key={row.id}>
        <td>{checkbox(row)}</td>
        <td><Link href={`/pesquisas/revisao/${row.id}`}>{row.name}</Link></td>
        <td>{segment}</td><td>{row.district || city}</td>
        <td>{resultPresence[digitalPresence(row.website, row.reviewedPresence)]}</td><td>{row.website || "—"}</td>
        <td><ReviewLink row={row} /></td><td><CrmLink row={row} /></td><td><SourceLink row={row} source={source} /></td>
      </tr>)}</tbody>
    </table>
    </div> : <ul className="discovery-grid">{displayed.map(row => <li key={row.id} className="panel discovery-card">
    <div className="discovery-card-heading">
      <span className="metric-icon" aria-hidden="true"><Building2 size={17} /></span>
      <div><h3><Link href={`/pesquisas/revisao/${row.id}`}>{row.name}</Link></h3><p>{segment}</p></div>{checkbox(row)}
    </div>
    <p className="discovery-card-location"><MapPin size={15} aria-hidden="true" /> {row.district ? `${row.district}, ${city}` : city}</p>
    <p><span className="pill">{resultPresence[digitalPresence(row.website, row.reviewedPresence)]}</span></p>
    {row.website && <p className="discovery-card-url">{row.website}</p>}
    <p className="discovery-card-source"><SourceLink row={row} source={source} /></p>
    <div className="toolbar discovery-card-actions"><ReviewLink row={row} /><CrmLink row={row} /></div>
    </li>)}</ul>}
  </>;
}
