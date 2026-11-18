"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { cancelDiscovery, discoveryNotices, executeDiscovery } from "@/features/discovery";

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
