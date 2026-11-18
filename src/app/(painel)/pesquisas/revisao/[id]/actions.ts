"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { reviewForm } from "@/features/qualification";
import { importOpportunity, saveReview } from "@/features/reviews";

export async function updateReview(resultId: string, _state: string, form: FormData) {
  const actor = await requireAdmin();
  const input = reviewForm.safeParse(Object.fromEntries(form));
  if (!input.success) return "Confira a URL, a situação, a evidência (12 a 1.000 caracteres) e os pesos (0 a 100).";
  if (!await saveReview(actor.id, id.parse(resultId), input.data)) return "Resultado expirado ou indisponível.";
  revalidatePath("/pesquisas", "layout");
  return "Revisão salva.";
}

export async function importReview(resultId: string, _state: string, form: FormData) {
  const actor = await requireAdmin();
  if (form.get("permission") !== "on") return "Confirme a permissão de uso antes de importar.";
  const company = await importOpportunity(actor.id, id.parse(resultId));
  if (!company) return "Salve uma revisão qualificada antes de importar.";
  revalidatePath("/", "layout");
  redirect(`/empresas/${company}`);
}
