import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { websiteProjects, websiteShareLinks } from "@/db/schema";
import { siteContent, templateId, toComposedSite } from "./site-content";
import { latestRevision } from "./site-revisions";
import { projectPublicDemo, publicDemo } from "./public-demo";

const tokenFormat = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const shareLifetimes = [1, 7, 30] as const;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

type Reader = Pick<ReturnType<typeof getDb>, "select">;

export async function readShareSource(db: Reader, project: typeof websiteProjects.$inferSelect) {
  const template = templateId.safeParse(project.template).data;
  if (project.status !== "ready" || !project.companyId || !template) return undefined;
  const [latest] = await latestRevision(db, project.id);
  const content = siteContent.safeParse(latest?.content ?? project.content).data;
  if (!content) return undefined;
  return { revision: latest?.revision ?? 0, snapshot: projectPublicDemo(toComposedSite(content), template) };
}

export function listShareLinks(projectId: string) {
  return getDb().select({
    id: websiteShareLinks.id, revision: websiteShareLinks.revision, expiresAt: websiteShareLinks.expiresAt,
    revokedAt: websiteShareLinks.revokedAt, createdAt: websiteShareLinks.createdAt,
  }).from(websiteShareLinks).where(eq(websiteShareLinks.projectId, projectId))
    .orderBy(desc(websiteShareLinks.createdAt), desc(websiteShareLinks.id));
}

export function createShareLink(projectId: string, actorId: string, base: number, days: typeof shareLifetimes[number]) {
  return getDb().transaction(async tx => {
    const [project] = await tx.select().from(websiteProjects).where(eq(websiteProjects.id, projectId)).for("update");
    const source = project && await readShareSource(tx, project);
    if (!source) return { error: "A demonstração precisa estar pronta e vinculada a uma empresa." };
    if (source.revision !== base) return { error: "Outra revisão foi salva. Atualize e confira a prévia antes de criar o link." };
    await tx.update(websiteShareLinks).set({ snapshot: null }).where(and(isNotNull(websiteShareLinks.snapshot),
      lte(websiteShareLinks.expiresAt, sql`now()`)));
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + days * 86400000);
    await tx.insert(websiteShareLinks).values({ projectId, actorId, ...source, tokenHash: hashToken(token), expiresAt });
    return { token };
  });
}

export async function revokeShareLink(projectId: string, linkId: string) {
  const [revoked] = await getDb().update(websiteShareLinks).set({ revokedAt: new Date(), snapshot: null })
    .where(and(eq(websiteShareLinks.id, linkId), eq(websiteShareLinks.projectId, projectId), isNull(websiteShareLinks.revokedAt)))
    .returning({ id: websiteShareLinks.id });
  return Boolean(revoked);
}

export async function getPublicDemo(rawToken: string) {
  const token = tokenFormat.safeParse(rawToken).data;
  if (!token) return undefined;
  const [link] = await getDb().select({ snapshot: websiteShareLinks.snapshot })
    .from(websiteShareLinks).innerJoin(websiteProjects, eq(websiteShareLinks.projectId, websiteProjects.id))
    .where(and(eq(websiteShareLinks.tokenHash, hashToken(token)), isNull(websiteShareLinks.revokedAt),
      gt(websiteShareLinks.expiresAt, sql`now()`), eq(websiteProjects.status, "ready"), isNotNull(websiteProjects.companyId)));
  return publicDemo.safeParse(link?.snapshot).data;
}
