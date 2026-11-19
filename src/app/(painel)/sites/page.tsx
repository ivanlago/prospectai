import Link from "next/link";
import { requireAdmin } from "@/auth";
import { Empty, PageHeader } from "@/components/controls";
import { formatDate } from "@/domain";
import { templateId, templates } from "@/features/site-content";
import { listSites } from "@/features/site-projects";
import { siteStatusLabels } from "@/features/company-demonstrations";

export const metadata = { title: "Sites gerados" };

export default async function Sites() {
  await requireAdmin();
  const projects = await listSites();
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 6 });

  return <>
    <PageHeader title="Sites gerados" description="Acompanhe as demonstrações privadas e o consumo estimado de geração." href="/empresas" action="Ver empresas" />
    <section className="panel">
      {projects.length === 0 ? <Empty>Abra uma empresa no CRM para gerar a primeira demonstração.</Empty> :
        <div className="table-scroll"><table><thead><tr><th>Empresa</th><th>Template</th><th>Situação</th><th>Tokens entrada / saída</th><th>Estimativa</th><th>Data</th></tr></thead>
          <tbody>{projects.map(project => {
            const template = templateId.safeParse(project.template).data;
            return <tr key={project.id}>
              <td><Link href={`/sites/${project.id}`}>{project.company ?? "Empresa excluída"}</Link></td>
              <td>{template ? templates[template].label : "—"}</td>
              <td><span className="pill">{siteStatusLabels[project.status]}</span></td>
              <td>{project.input ?? "—"} / {project.output ?? "—"}</td>
              <td>{money.format(project.costMicros / 1000000)}</td><td>{formatDate(project.createdAt)}</td>
            </tr>;
          })}</tbody></table></div>}
    </section>
  </>;
}
