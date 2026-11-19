"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { editorInput } from "@/features/site-content";
import { readSitePhoto } from "@/features/site-photo";
import { saveRevision } from "@/features/site-revisions";

const revisionNumber = z.string().regex(/^\d{1,9}$/).transform(Number);

export async function persistRevision(projectId: string, _state: string, data: FormData) {
  const actor = await requireAdmin();
  if (!id.safeParse(projectId).success) return "Demonstração indisponível.";
  const base = revisionNumber.safeParse(data.get("base")).data;
  if (base === undefined) return "Versão inválida. Atualize a página.";
  const restore = data.get("restore");
  if (restore !== null) {
    const target = revisionNumber.safeParse(restore).data;
    if (target === undefined) return "Revisão inválida.";
    const result = await saveRevision(projectId, actor.id, base, { restore: target });
    if (result.error) return result.error;
    revalidatePath(`/sites/${projectId}`);
    redirect(`/sites/${projectId}/editar?salva=${result.revision}`);
  }
  const raw = data.get("document");
  if (typeof raw !== "string" || raw.length > 16000) return "Documento inválido.";
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return "Documento inválido."; }
  const edit = editorInput.safeParse(input).data;
  if (!edit) return "Confira os textos, os limites e as opções de aparência.";
  const { photo, error } = await readSitePhoto(data);
  if (error) return error;
  const result = await saveRevision(projectId, actor.id, base, {
    edit: current => ({
      ...current, copy: edit.copy, valueProposition: edit.valueProposition, editor: edit.editor,
      serviceDescriptions: edit.serviceDescriptions,
      photo: photo ?? (edit.removePhoto ? undefined : current.photo),
    }),
  });
  if (result.error) return result.error;
  revalidatePath(`/sites/${projectId}`);
  redirect(`/sites/${projectId}/editar?salva=${result.revision}`);
}
