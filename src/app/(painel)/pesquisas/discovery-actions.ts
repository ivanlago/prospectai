"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { searchRuns } from "@/db/schema";
import { id, searchForm } from "@/domain";
import { cancelDiscovery, discoveryNotices, executeDiscovery } from "@/features/discovery";
import { osmFilters } from "@/integrations/discovery/overpass";

export async function runSearch(searchId: string, _state: string, form: FormData) {
  await requireAdmin();
  const result = await executeDiscovery(id.parse(searchId), form.get("category"), form.get("provider"));
  if (!result.id) return discoveryNotices[result.error ?? "invalid"] ?? discoveryNotices.invalid;
  revalidatePath("/pesquisas");
  redirect(`/pesquisas/execucoes/${result.id}`);
}

export async function cancelRun(runId: string) {
  await requireAdmin();
  await cancelDiscovery(id.parse(runId));
  revalidatePath("/pesquisas", "layout");
}

export async function repeatRun(runId: string) {
  await requireAdmin();
  const validId = id.safeParse(runId).data;
  if (!validId) return discoveryNotices.missing;
  const [run] = await getDb().select().from(searchRuns).where(eq(searchRuns.id, validId));
  if (!run?.searchId || run.status === "running") return discoveryNotices.missing;
  const filters = osmFilters.safeParse(run.filters).data;
  if (!filters) return discoveryNotices.filters;
  const criteria = searchForm.safeParse({
    ...filters, name: "Reexecução", segment: filters.category, country: "Brasil",
    radius: null, rating: null, reviews: null,
  }).data;
  if (!criteria) return discoveryNotices.filters;
  const result = await executeDiscovery(run.searchId, filters.category, run.provider, criteria);
  if (!result.id) return discoveryNotices[result.error ?? "invalid"] ?? discoveryNotices.invalid;
  revalidatePath("/pesquisas");
  redirect(`/pesquisas/execucoes/${result.id}`);
}
