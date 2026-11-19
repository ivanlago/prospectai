import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { ComposedSitePreview } from "@/components/composed-site-preview";
import { Empty, PageHeader } from "@/components/controls";
import { ActionForm } from "@/components/forms";
import { SiteShareForm } from "@/components/site-share-form";
import { getDb } from "@/db";
import { websiteProjects } from "@/db/schema";
import { id } from "@/domain";
import { demoPreview } from "@/features/public-demo";
import { listShareLinks, readShareSource } from "@/features/site-sharing";
import { issueLink, revokeLink } from "./actions";

export default async function ShareSite({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const projectId = id.safeParse((await params).id).data;
  if (!projectId) notFound();
  const db = getDb();
  const [project] = await db.select().from(websiteProjects).where(eq(websiteProjects.id, projectId));
  if (!project) notFound();
  const [source, links] = await Promise.all([readShareSource(db, project), listShareLinks(projectId)]);
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });
  const now = new Date();
  return <>
    <PageHeader title="Compartilhar demonstração" description="Crie um link com prazo para uma revisão específica."
      href={`/sites/${projectId}`} action="Voltar à demonstração" />
    {source ? <>
      <section className="stack" aria-label="Prévia do conteúdo compartilhado">
        <p>Confira o que qualquer pessoa com o link poderá ver. A prévia omite endereço completo, contatos e fotos privadas.</p>
        <ComposedSitePreview content={demoPreview(source.snapshot)} template={source.snapshot.template} />
      </section>
      <section className="panel padded stack" aria-label="Criar link">
        <h2>Compartilhar revisão {source.revision}</h2>
        <SiteShareForm key={source.revision} revision={source.revision} action={issueLink.bind(null, projectId)} />
      </section>
    </> : <p className="feedback">A demonstração precisa estar pronta e vinculada a uma empresa para gerar um link.</p>}
    <section className="panel padded stack" aria-label="Gerenciar links">
      <h2>Links criados</h2>
      {links.length === 0 ? <Empty>Nenhum link criado.</Empty> : <div className="table-scroll">
        <table><thead><tr><th>Revisão</th><th>Criado em</th><th>Validade</th><th>Estado</th><th>Ação</th></tr></thead>
          <tbody>{links.map(link => {
            const status = link.revokedAt ? "Revogado" : link.expiresAt <= now ? "Expirado" : !project.companyId ? "Indisponível" : "Ativo";
            return <tr key={link.id}>
              <td>{link.revision}</td><td>{date.format(link.createdAt)}</td><td>{date.format(link.expiresAt)}</td><td>{status}</td>
              <td>{status === "Ativo" && <ActionForm label="Revogar link" action={revokeLink.bind(null, projectId, link.id)}>{null}</ActionForm>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </>;
}
