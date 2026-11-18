import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { getDb, getPool } from "../src/db";
import { accounts, users } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

async function provision() {
  const input = z.object({ email: z.email().max(254), password: z.string().min(14).max(128) }).safeParse({
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD,
  });
  if (!input.success) throw new Error("Informe ADMIN_EMAIL e ADMIN_PASSWORD (14 a 128 caracteres).");

  const userId = randomUUID();
  const now = new Date();
  const password = await hashPassword(input.data.password);
  try {
    await getDb().transaction(async tx => {
      await tx.insert(users).values({ id: userId, email: input.data.email, name: "Administrador" });
      await tx.insert(accounts).values({ accountId: userId, userId, providerId: "credential", password, createdAt: now, updatedAt: now });
    });
  } catch {
    throw new Error("Falha ao provisionar. Verifique a conexão, as migrações e se já existe um administrador.");
  }
}

try {
  await provision();
  console.log("Administrador criado. Remova ADMIN_PASSWORD do ambiente.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha ao provisionar.");
  process.exitCode = 1;
} finally {
  if (process.env.DATABASE_URL) await getPool().end();
}
