"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { generationForm } from "@/features/site-content";
import { generateSite, generationMessages } from "@/features/site-projects";

export async function buildSite(companyId: string, provider: string, _state: string, data: FormData) {
  await requireAdmin();
  const form = generationForm.safeParse(Object.fromEntries(data));
  if (!form.success) return "Confira o template, os serviços e a autorização para enviar os dados.";
  const outcome = await generateSite(id.parse(companyId), form.data, provider);
  if (!outcome.projectId) return generationMessages[outcome.error ?? "provider"] ?? generationMessages.provider;
  revalidatePath("/sites");
  redirect(`/sites/${outcome.projectId}`);
}
