import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { activities, auditLogs, companies, companySources, discoveryResults, searchRuns, websiteReviews } from "@/db/schema";
import { categoryOptions, osmFilters, stateLabel } from "@/integrations/discovery/overpass";
import { assessOpportunity, type Review } from "./qualification";

function reviewQuery(db: Pick<ReturnType<typeof getDb>, "select">, resultId: string) {
  return db.select({ result: discoveryResults, run: searchRuns, review: websiteReviews })
    .from(discoveryResults).innerJoin(searchRuns, eq(searchRuns.id, discoveryResults.runId))
    .leftJoin(websiteReviews, eq(websiteReviews.resultId, discoveryResults.id))
    .where(and(eq(discoveryResults.id, resultId), gt(searchRuns.expiresAt, sql`now()`)));
}

export const getReview = (resultId: string) => reviewQuery(getDb(), resultId);

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
    const [existing] = await tx.select({ id: companySources.companyId }).from(companySources)
      .where(and(eq(companySources.provider, provider), eq(companySources.reference, result.reference)));
    if (existing) return existing.id;
    const [company] = await tx.insert(companies).values({
      name: result.name, city: filters.city, state: stateLabel(filters.state), country: "Brasil",
      segment: categoryOptions.find(option => option.value === filters.category)?.label ?? filters.category,
      website: review.presence === "website_found" ? review.website : "",
      stage: "qualified", source: provider, identityKey: result.identityKey,
    }).onConflictDoNothing({ target: companies.identityKey }).returning({ id: companies.id });
    if (!company) {
      const [duplicate] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.identityKey, result.identityKey));
      return duplicate?.id ?? null;
    }
    await tx.insert(companySources).values({
      companyId: company.id, provider, reference: result.reference, permission: "ODbL 1.0",
      review: { provider: run.provider, presence: review.presence, reviewedAt: review.reviewedAt.toISOString(),
        score: review.score, evidence: review.evidence, breakdown: review.breakdown },
    });
    await tx.insert(activities).values({ companyId: company.id, actorId, type: "company.imported", detail: `Importada após revisão. Score ${review.score}/100.` });
    await tx.insert(auditLogs).values({ entityId: company.id, actorId, event: "company.imported" });
    return company.id;
  });
}
