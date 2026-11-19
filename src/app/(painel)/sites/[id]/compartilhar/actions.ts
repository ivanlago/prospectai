"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { id } from "@/domain";
import { createShareLink, revokeShareLink } from "@/features/site-sharing";

const input = z.object({
  revision: z.string().regex(/^\d{1,9}$/).transform(Number),
  days: z.enum(["1", "7", "30"]).transform(value => Number(value) as 1 | 7 | 30),
  approval: z.literal("on"),
});

export async function issueLink(projectId: string, _state: { message: string; url?: string }, form: FormData) {
  const actor = await requireAdmin();
  const data = input.safeParse(Object.fromEntries(form)).data;
  if (!id.safeParse(projectId).success || !data) return { message: "Confira o prazo e confirme o conteúdo público." };
  const origin = URL.parse(process.env.BETTER_AUTH_URL ?? "");
  if (!origin || !["http:", "https:"].includes(origin.protocol)) return { message: "Configure a origem pública da aplicação." };
  const result = await createShareLink(projectId, actor.id, data.revision, data.days);
  if (!result.token) return { message: result.error ?? "Não foi possível criar o link." };
  revalidatePath(`/sites/${projectId}/compartilhar`);
  return { message: "Link criado. Copie agora para guardar o endereço.", url: new URL(`/demo/${result.token}`, origin.origin).href };
}

export async function revokeLink(projectId: string, linkId: string) {
  await requireAdmin();
  if (!id.safeParse(projectId).success || !id.safeParse(linkId).success) return "Link inválido.";
  if (!await revokeShareLink(projectId, linkId)) return "Link indisponível ou já revogado.";
  revalidatePath(`/sites/${projectId}/compartilhar`);
  return "Link revogado.";
}
