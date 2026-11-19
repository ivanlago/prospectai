import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { activities, companies, companyOriginReviews, companySources, sessions, users, websiteProjects, websiteRevisions } from "../src/db/schema";

it("aplica a migração e garante integridade dos registros", async () => {
  const client = await PGlite.create();
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [admin] = await db.insert(users).values({ name: "Admin", email: "admin@example.test" }).returning();
    await expect(db.insert(users).values({ name: "Outro", email: "outro@example.test" })).rejects.toThrow();
    const data = { name: "Empresa", city: "Salvador", state: "Bahia", country: "Brasil", segment: "Saúde", identityKey: "test" };
    const [company] = await db.insert(companies).values(data).returning();
    expect(company.stage).toBe("new");
    await expect(db.insert(companies).values(data)).rejects.toThrow();
    await db.insert(activities).values({ companyId: company.id, actorId: admin.id, detail: "Cadastro", type: "created" });
    await db.delete(companies).where(eq(companies.id, company.id));
    expect(await db.select().from(activities)).toHaveLength(0);
    const now = new Date();
    await db.insert(sessions).values({ token: "test", userId: admin.id, expiresAt: now, createdAt: now, updatedAt: now });
    await db.delete(users).where(eq(users.id, admin.id));
    expect(await db.select().from(sessions)).toHaveLength(0);
  } finally {
    await client.close();
  }
});

it("aplica a migração aditiva sobre projetos existentes e protege a sequência de revisões", async () => {
  const client = await PGlite.create();
  const previousFolder = await mkdtemp(join(tmpdir(), "prospectai-migrations-"));
  try {
    const db = drizzle(client);
    const config = { migrationsFolder: "drizzle" };
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as { entries: { idx: number; tag: string }[] };
    const previous = journal.entries.filter(entry => entry.idx < 4);
    await mkdir(join(previousFolder, "meta"));
    await writeFile(join(previousFolder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: previous }));
    await Promise.all(previous.map(({ tag }) => copyFile(join("drizzle", `${tag}.sql`), join(previousFolder, `${tag}.sql`))));
    await migrate(db, { migrationsFolder: previousFolder });
    const original = { name: "Empresa de teste", services: [] };
    const [company] = await db.insert(companies).values({ name: original.name, segment: "Serviços",
      country: "Brasil", state: "Bahia", city: "Salvador", identityKey: "fixture-origem" }).returning();
    const review = { evidence: "Revisão anterior à migração", score: 55 };
    await db.insert(companySources).values({ companyId: company.id, provider: "openstreetmap", reference: "node/7", permission: "ODbL 1.0", review });
    const [project] = await db.insert(websiteProjects).values({
      template: "services", status: "ready", model: "fixture", costMicros: 0, content: original,
    }).returning();

    await migrate(db, config);
    expect(await db.select().from(companyOriginReviews)).toMatchObject([{ companyId: company.id, reference: "node/7", permission: "ODbL 1.0", review }]);
    expect(await db.select().from(companySources)).toMatchObject([{ companyId: company.id, review }]);
    const [stored] = await db.select().from(websiteProjects).where(eq(websiteProjects.id, project.id));
    expect(stored.content).toEqual(original);
    const revision = { projectId: project.id, revision: 1, content: { ...original, version: 1 } };
    await db.insert(websiteRevisions).values(revision);
    await expect(db.insert(websiteRevisions).values(revision)).rejects.toThrow();
    expect(await db.select().from(websiteRevisions)).toHaveLength(1);
  } finally {
    await client.close();
    await rm(previousFolder, { recursive: true, force: true });
  }
});
