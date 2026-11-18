"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { getDb } from "@/db";
import { searches } from "@/db/schema";
import { companyForm, id, searchForm, stages } from "@/domain";
import { addNote, deleteCompany, moveCompany, saveCompany } from "@/features/companies";

export async function persistCompany(companyId: string | null, _state: string, form: FormData) {
  const actor = await requireAdmin();
  const parsed = companyForm.safeParse(Object.fromEntries(form));
  if (!parsed.success || (companyId && !id.safeParse(companyId).success)) return "Confira os campos. Informe o site com https:// ou http://.";
  let saved: string | null;
  try {
    saved = await saveCompany(actor.id, parsed.data, companyId ?? undefined);
  } catch (error) {
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") return "Já existe uma empresa com esse nome e localização.";
    console.error({ event: "company.save_failed" });
    return "Não foi possível salvar a empresa. Tente novamente.";
  }
  if (!saved) return "Empresa indisponível.";
  revalidatePath("/", "layout");
  redirect(`/empresas/${saved}?salvo=1`);
}

export async function removeCompany(companyId: string) {
  const actor = await requireAdmin();
  await deleteCompany(actor.id, id.parse(companyId));
  revalidatePath("/", "layout");
  redirect("/empresas?excluida=1");
}

export async function setStage(form: FormData) {
  const actor = await requireAdmin();
  const input = z.object({ companyId: id, stage: stages }).parse(Object.fromEntries(form));
  await moveCompany(actor.id, input.companyId, input.stage);
  revalidatePath("/", "layout");
}

export async function saveNote(companyId: string, _state: string, form: FormData) {
  const actor = await requireAdmin();
  const note = z.string().trim().min(1).max(4000).safeParse(form.get("note"));
  if (!note.success) return "Informe uma nota com até 4.000 caracteres.";
  await addNote(actor.id, id.parse(companyId), note.data);
  revalidatePath(`/empresas/${companyId}`);
  return "Nota registrada.";
}

export async function persistSearch(searchId: string | null, _state: string, form: FormData) {
  await requireAdmin();
  const data = Object.fromEntries(form);
  const parsed = searchForm.safeParse({
    ...data, radius: data.radius || null, rating: data.rating || null, reviews: data.reviews || null,
  });
  if (!parsed.success || (searchId && !id.safeParse(searchId).success)) return "Confira a configuração e os limites informados.";
  const { name, ...config } = parsed.data;
  const values = { name, config, updatedAt: new Date() };
  if (searchId) {
    const [updated] = await getDb().update(searches).set(values).where(eq(searches.id, searchId)).returning({ id: searches.id });
    if (!updated) return "Pesquisa indisponível.";
  } else {
    await getDb().insert(searches).values(values);
  }
  revalidatePath("/", "layout");
  redirect("/pesquisas?salva=1");
}

export async function removeSearch(searchId: string) {
  await requireAdmin();
  await getDb().delete(searches).where(eq(searches.id, id.parse(searchId)));
  revalidatePath("/", "layout");
  redirect("/pesquisas?excluida=1");
}
