import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { websiteProjects, websiteRevisions } from "@/db/schema";
import { composedSite, siteContent, toComposedSite, type ComposedSite } from "./site-content";

export function latestRevision(db: Pick<ReturnType<typeof getDb>, "select">, projectId: string) {
  return db.select({ revision: websiteRevisions.revision, content: websiteRevisions.content })
    .from(websiteRevisions).where(eq(websiteRevisions.projectId, projectId))
    .orderBy(desc(websiteRevisions.revision)).limit(1);
}

export function revisionHistory(projectId: string) {
  return getDb().select({ revision: websiteRevisions.revision, createdAt: websiteRevisions.createdAt, restoredFrom: websiteRevisions.restoredFrom })
    .from(websiteRevisions).where(eq(websiteRevisions.projectId, projectId))
    .orderBy(desc(websiteRevisions.revision));
}

export function saveRevision(projectId: string, actorId: string, base: number, change:
  | { restore: number }
  | { edit: (content: ComposedSite) => unknown },
) {
  return getDb().transaction(async tx => {
    const [project] = await tx.select().from(websiteProjects).where(eq(websiteProjects.id, projectId)).for("update");
    if (project?.status !== "ready") return { error: "Demonstração indisponível para edição." };
    const [latest] = await latestRevision(tx, projectId);
    const current = latest?.revision ?? 0;
    if (base !== current) return { error: "Outra revisão foi salva. Atualize a página antes de tentar novamente." };
    let content: ComposedSite | undefined;
    if ("restore" in change) {
      if (change.restore >= current) return { error: "Escolha uma revisão anterior." };
      const [source] = change.restore === 0 ? [project] : await tx.select({ content: websiteRevisions.content })
        .from(websiteRevisions).where(and(eq(websiteRevisions.projectId, projectId), eq(websiteRevisions.revision, change.restore)));
      const original = siteContent.safeParse(source?.content).data;
      if (original) content = toComposedSite(original);
    } else {
      const original = siteContent.safeParse(latest ? latest.content : project.content).data;
      if (original) content = composedSite.safeParse(change.edit(toComposedSite(original))).data;
    }
    if (!content) return { error: "A revisão contém conteúdo inválido ou indisponível." };
    const revision = current + 1;
    await tx.insert(websiteRevisions).values({
      projectId, actorId, revision, content, restoredFrom: "restore" in change ? change.restore : null,
    });
    return { revision };
  });
}
