export async function readSitePhoto(data: FormData): Promise<{ photo?: string; error?: string }> {
  const file = data.get("photo");
  if (!(file instanceof File) || !file.size) return {};
  if (data.get("authorizePhoto") !== "on") return { error: "Confirme a permissão de uso da foto anexada." };
  if (file.size > 500 * 1024) return { error: "Escolha uma foto de até 500 KB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = bytes.subarray(0, 3).toString("hex") === "ffd8ff" ? "jpeg"
    : bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? "png"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  return type ? { photo: `data:image/${type};base64,${bytes.toString("base64")}` } : { error: "Use uma foto JPEG, PNG ou WebP." };
}
