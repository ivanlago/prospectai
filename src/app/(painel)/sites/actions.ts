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
  const file = data.get("photo");
  let photo: string | undefined;
  if (["beauty", "dental"].includes(form.data.template) && file instanceof File && file.size > 0) {
    if (file.size > 500 * 1024) return "Escolha uma foto de até 500 KB.";
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = bytes.subarray(0, 3).toString("hex") === "ffd8ff" ? "jpeg"
      : bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? "png"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp"
      : null;
    if (!type) return "Use uma foto JPEG, PNG ou WebP.";
    photo = `data:image/${type};base64,${bytes.toString("base64")}`;
  }
  const outcome = await generateSite(id.parse(companyId), form.data, provider, photo);
  if (!outcome.projectId) return generationMessages[outcome.error ?? "provider"] ?? generationMessages.provider;
  revalidatePath("/sites");
  redirect(`/sites/${outcome.projectId}`);
}
