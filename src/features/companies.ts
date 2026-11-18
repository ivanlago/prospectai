import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { activities, auditLogs, companies } from "@/db/schema";
import { companyKey, companyForm, stages } from "@/domain";
import type { z } from "zod";

export const companyPageSize = 20;

export function listCompanies(query: string, stage: z.infer<typeof stages> | undefined, page: number) {
  const term = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const filters: (SQL | undefined)[] = [stage ? eq(companies.stage, stage) : undefined];
  if (query) filters.push(or(ilike(companies.name, term), ilike(companies.city, term), ilike(companies.segment, term)));
  return getDb().select().from(companies).where(and(...filters)).orderBy(desc(companies.createdAt), desc(companies.id))
    .limit(companyPageSize + 1).offset((page - 1) * companyPageSize);
}

export async function getCompany(id: string) {
  const [company] = await getDb().select().from(companies).where(eq(companies.id, id));
  return company;
}

export function stageTotals() {
  return getDb().select({ stage: companies.stage, total: count() }).from(companies).groupBy(companies.stage);
}

export async function saveCompany(actorId: string, values: z.infer<typeof companyForm>, id?: string) {
  const record = { ...values, identityKey: companyKey(values) };
  return getDb().transaction(async tx => {
    const [company] = id
      ? await tx.update(companies).set({ ...record, updatedAt: new Date() }).where(eq(companies.id, id)).returning({ id: companies.id })
      : await tx.insert(companies).values(record).returning({ id: companies.id });
    if (!company) return null;
    const event = id ? "company.updated" : "company.created";
    await tx.insert(activities).values({ companyId: company.id, actorId, type: event, detail: id ? "Cadastro atualizado." : "Empresa cadastrada manualmente." });
    await tx.insert(auditLogs).values({ entityId: company.id, actorId, event });
    return company.id;
  });
}

export function deleteCompany(actorId: string, id: string) {
  return getDb().transaction(async tx => {
    const [deleted] = await tx.delete(companies).where(eq(companies.id, id)).returning({ id: companies.id });
    if (deleted) await tx.insert(auditLogs).values({ entityId: deleted.id, actorId, event: "company.deleted" });
  });
}

export function moveCompany(actorId: string, id: string, stage: z.infer<typeof stages>) {
  return getDb().transaction(async tx => {
    const [company] = await tx.select({ stage: companies.stage }).from(companies).where(eq(companies.id, id)).for("update");
    if (!company || company.stage === stage) return;
    await tx.update(companies).set({ stage, updatedAt: new Date() }).where(eq(companies.id, id));
    await tx.insert(activities).values({ companyId: id, actorId, type: "crm.moved", detail: `${company.stage}:${stage}` });
    await tx.insert(auditLogs).values({ entityId: id, actorId, event: "crm.moved" });
  });
}

export function companyActivity(id: string) {
  return getDb().select().from(activities).where(eq(activities.companyId, id)).orderBy(desc(activities.createdAt)).limit(30);
}

export async function addNote(actorId: string, id: string, detail: string) {
  await getDb().transaction(async tx => {
    const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, id)).for("key share");
    if (company) await tx.insert(activities).values({ companyId: id, actorId, type: "crm.note", detail });
  });
}
