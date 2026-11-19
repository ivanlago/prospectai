import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { websiteProjects, websiteRevisions, websiteShareLinks } from "@/db/schema";

export const siteStatusLabels = { ready: "Pronta", running: "Em geração", failed: "Falhou" };

export async function companyDemonstrations(companyId: string) {
  const db = getDb();
  const [projects, events] = await Promise.all([
    db.select({
      id: websiteProjects.id, template: websiteProjects.template, status: websiteProjects.status, createdAt: websiteProjects.createdAt,
      revision: sql<number>`coalesce((select max(r.revision) from ${websiteRevisions} r where r.project_id = ${websiteProjects.id}), 0)`,
      activeLinks: sql<number>`(select count(*)::int from ${websiteShareLinks} l where l.project_id = ${websiteProjects.id}
        and l.revoked_at is null and l.expires_at > now())`,
    }).from(websiteProjects).where(eq(websiteProjects.companyId, companyId))
      .orderBy(desc(websiteProjects.createdAt), desc(websiteProjects.id)).limit(20),
    db.execute<{ projectId: string; template: string; kind: string; revision: number; restoredFrom: number | null; at: Date | string }>(sql`
      select p.id as "projectId", p.template, e.kind, e.revision, e.restored_from as "restoredFrom", e.at
      from ${websiteProjects} p
      cross join lateral (
        select 'generation' as kind, 0 as revision, null::int as restored_from, p.created_at as at
        union all select 'revision', r.revision, r.restored_from, r.created_at from ${websiteRevisions} r where r.project_id = p.id
        union all select 'share', l.revision, null::int, l.created_at from ${websiteShareLinks} l where l.project_id = p.id
        union all select 'revoked', l.revision, null::int, l.revoked_at from ${websiteShareLinks} l where l.project_id = p.id and l.revoked_at is not null
      ) e
      where p.company_id = ${companyId}
      order by e.at desc, p.id, e.revision desc, e.kind
      limit 30
    `),
  ]);
  return { projects, events: events.rows.map(event => ({ ...event, at: new Date(event.at) })) };
}
