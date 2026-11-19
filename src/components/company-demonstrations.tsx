import Link from "next/link";
import { Empty } from "./controls";
import { formatDate } from "@/domain";
import { templateId, templates } from "@/features/site-content";
import { companyDemonstrations, siteStatusLabels } from "@/features/company-demonstrations";

function templateLabel(value: string) {
  const template = templateId.safeParse(value).data;
  return template ? templates[template].label : "Template indisponível";
}

export function CompanyDemonstrations({ projects, events }: Awaited<ReturnType<typeof companyDemonstrations>>) {
  return <section className="panel padded stack" aria-labelledby="company-demos">
    <div className="section-header"><h2 id="company-demos">Demonstrações da empresa</h2><Link href="/sites">Ver todos os sites</Link></div>
    {projects.length === 0 ? <Empty>Nenhuma demonstração vinculada.</Empty> :
      <div className="table-scroll"><table>
        <thead><tr><th>Template</th><th>Criada em</th><th>Situação</th><th>Revisão atual</th><th>Links ativos</th><th>Ações</th></tr></thead>
        <tbody>{projects.map(project => <tr key={project.id}>
          <td>{templateLabel(project.template)}</td><td>{formatDate(project.createdAt)}</td>
          <td><span className="pill">{siteStatusLabels[project.status]}</span></td>
          <td>{project.status === "ready" ? project.revision : "—"}</td><td>{project.status === "ready" ? project.activeLinks : "—"}</td>
          <td><div className="toolbar"><Link href={`/sites/${project.id}`}>Ver demonstração</Link>
            {project.status === "ready" && <>
              <Link href={`/sites/${project.id}/editar`}>Revisões</Link>
              <Link href={`/sites/${project.id}/compartilhar`}>Gerenciar links</Link>
            </>}
          </div></td>
        </tr>)}</tbody>
      </table></div>}
    {events.length > 0 && <details>
      <summary>Histórico de demonstrações</summary>
      <ul className="history">{events.map((event, index) => {
        const label = event.kind === "generation" ? "Geração iniciada" :
          event.kind === "share" ? `Link criado para a revisão ${event.revision}` :
          event.kind === "revoked" ? `Link revogado da revisão ${event.revision}` :
          event.restoredFrom === null ? `Revisão ${event.revision} salva` :
          `Revisão ${event.revision} restaurada da revisão ${event.restoredFrom}`;
        return <li key={`${event.projectId}:${index}`}>
          <time dateTime={event.at.toISOString()}>{formatDate(event.at)}</time>
          <p>{label} · <Link href={`/sites/${event.projectId}`}>{templateLabel(event.template)}</Link></p>
        </li>;
      })}</ul>
    </details>}
  </section>;
}
