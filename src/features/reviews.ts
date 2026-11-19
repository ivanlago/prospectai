import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, auditLogs, companies, companyOriginReviews, companySources, discoveryResults, searchRuns, websiteReviews } from "@/db/schema";
import { categoryOptions, osmFilters, stateLabel } from "@/integrations/discovery/overpass";
import { assessOpportunity, type Review } from "./qualification";

function reviewQuery(db: Pick<ReturnType<typeof getDb>, "select">, resultId: string) {
  return db.select({ result: discoveryResults, run: searchRuns, review: websiteReviews })
    .from(discoveryResults).innerJoin(searchRuns, eq(searchRuns.id, discoveryResults.runId))
    .leftJoin(websiteReviews, eq(websiteReviews.resultId, discoveryResults.id))
    .where(and(eq(discoveryResults.id, resultId), gt(searchRuns.expiresAt, sql`now()`)));
}

export const getReview = (resultId: string) => reviewQuery(getDb(), resultId);

export async function companyOrigins(companyId: string) {
  const db = getDb();
  const [history, [legacy]] = await Promise.all([
    db.select().from(companyOriginReviews).where(eq(companyOriginReviews.companyId, companyId))
      .orderBy(desc(companyOriginReviews.reviewedAt), desc(companyOriginReviews.id)),
    db.select().from(companySources).where(eq(companySources.companyId, companyId)),
  ]);
  if (!legacy || history.some(source => source.provider === legacy.provider && source.reference === legacy.reference &&
      JSON.stringify(source.review) === JSON.stringify(legacy.review))) return history;
  return [...history, { ...legacy, id: legacy.companyId, reviewedAt: legacy.createdAt }];
}

export function saveReview(actorId: string, resultId: string, input: Review) {
  return getDb().transaction(async tx => {
    const [entry] = await reviewQuery(tx, resultId).for("update", { of: discoveryResults });
    if (!entry) return false;
    const review = {
      actorId, presence: input.presence, evidence: input.evidence, website: input.website,
      ...assessOpportunity(input), reviewedAt: new Date(),
    };
    await tx.insert(websiteReviews).values({ resultId, ...review })
      .onConflictDoUpdate({ target: websiteReviews.resultId, set: review });
    return true;
  });
}

export function importOpportunity(actorId: string, resultId: string) {
  return getDb().transaction(async tx => {
    const [entry] = await reviewQuery(tx, resultId).for("update", { of: discoveryResults });
    if (!entry?.review?.qualified) return null;
    const { review, result, run } = entry;
    if (!["openstreetmap", "openstreetmap-geofabrik"].includes(run.provider)) return null;
    const filters = osmFilters.safeParse(run.filters).data;
    if (!filters) return null;
    const provider = "openstreetmap";
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${result.reference}))`);
    const [existing] = await tx.select({ id: companyOriginReviews.companyId }).from(companyOriginReviews)
      .where(and(eq(companyOriginReviews.provider, provider), eq(companyOriginReviews.reference, result.reference)))
      .orderBy(asc(companyOriginReviews.createdAt), asc(companyOriginReviews.id)).limit(1);
    const [legacy] = existing ? [] : await tx.select({ id: companySources.companyId }).from(companySources)
      .where(and(eq(companySources.provider, provider), eq(companySources.reference, result.reference)));
    const matched = existing ?? legacy;
    const [created] = matched ? [] : await tx.insert(companies).values({
      name: result.name, city: filters.city, state: stateLabel(filters.state), country: "Brasil",
      segment: categoryOptions.find(option => option.value === filters.category)?.label ?? filters.category,
      website: review.presence === "website_found" ? review.website : "",
      stage: "qualified", source: provider, identityKey: result.identityKey,
    }).onConflictDoNothing({ target: companies.identityKey }).returning({ id: companies.id });
    let companyId = matched?.id ?? created?.id;
    if (!companyId) {
      const [duplicate] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.identityKey, result.identityKey));
      companyId = duplicate?.id;
    }
    if (!companyId) return null;
    const reviewedAt = review.reviewedAt.toISOString();
    const evidence = {
      provider: run.provider, presence: review.presence, reviewedAt, score: review.score,
      evidence: review.evidence, breakdown: review.breakdown, website: review.website, resultId: result.id, runId: run.id,
      consultedAt: z.object({ consultedAt: z.iso.datetime() }).safeParse(run.filters).data?.consultedAt ?? run.createdAt.toISOString(),
    };
    const origin = { companyId, provider, reference: result.reference, permission: "ODbL 1.0", review: evidence };
    if (created) await tx.insert(companySources).values(origin);
    const [alreadyRecorded] = await tx.select({ id: companyOriginReviews.id }).from(companyOriginReviews)
      .where(and(eq(companyOriginReviews.companyId, companyId), eq(companyOriginReviews.provider, provider),
        eq(companyOriginReviews.reference, result.reference), sql`${companyOriginReviews.review}->>'reviewedAt' = ${reviewedAt}`)).limit(1);
    if (alreadyRecorded) return companyId;
    const [record] = await tx.insert(companyOriginReviews).values({ ...origin, reviewedAt: review.reviewedAt })
      .onConflictDoNothing().returning({ id: companyOriginReviews.id });
    if (record) {
      const event = created ? "company.imported" : "company.origin_recorded";
      await tx.insert(activities).values({ companyId, actorId, type: event,
        detail: created ? `Importada após revisão. Score ${review.score}/100.` : `Evidência de origem registrada. Score ${review.score}/100.` });
      await tx.insert(auditLogs).values({ entityId: companyId, actorId, event });
    }
    return companyId;
  });
}
