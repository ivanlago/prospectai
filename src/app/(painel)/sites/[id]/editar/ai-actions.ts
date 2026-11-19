"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { applySiteEdit, proposeSiteEdit } from "@/features/site-ai-edit";
import type { EditProposal } from "@/features/site-edit-operations";
import { generationMessages } from "@/features/site-projects";

type AssistantState = { message: string; attemptId?: string; proposal?: EditProposal; costMicros?: number; inputTokens?: number; outputTokens?: number };
const request = z.object({ instruction: z.string().trim().min(5).max(600), authorize: z.literal("on") });

export async function requestEdit(projectId: string, base: number, provider: string, _state: AssistantState, data: FormData): Promise<AssistantState> {
  const actor = await requireAdmin();
  if (!id.safeParse(projectId).success || !Number.isSafeInteger(base) || base < 0) return { message: "Revisão inválida." };
  const input = request.safeParse(Object.fromEntries(data)).data;
  if (!input) return { message: "Informe um pedido de 5 a 600 caracteres e confirme o envio." };
  const result = await proposeSiteEdit(projectId, actor.id, base, input.instruction, provider);
  if (result.attemptId) return { ...result, message: "Revise a proposta antes de aplicar." };
  const code = result.error ?? "invalid";
  return { message: code === "stale" ? "Outra revisão foi salva. Atualize o editor para continuar."
    : code === "empty" ? "O assistente não encontrou uma alteração aplicável ao pedido."
    : generationMessages[code] ?? generationMessages.invalid };
}

export async function confirmEdit(projectId: string, attemptId: string): Promise<string> {
  const actor = await requireAdmin();
  if (!id.safeParse(projectId).success || !id.safeParse(attemptId).success) return "Proposta inválida.";
  const result = await applySiteEdit(projectId, actor.id, attemptId);
  if (result.error) return result.error;
  revalidatePath(`/sites/${projectId}`);
  redirect(`/sites/${projectId}/editar?salva=${result.revision}&origem=ia`);
}
