import { gemini } from "./gemini";
import { groq } from "./groq";

export function siteAiProvider() {
  const selected = process.env.AI_PROVIDER?.trim() || "gemini";
  if (selected === "groq") return groq();
  if (selected === "gemini") return gemini();
  return null;
}
