import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { activities, companies, sessions, users } from "../src/db/schema";

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
