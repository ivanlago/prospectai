import { z } from "zod";
import { classifyWebsite } from "./qualification";

export const resultPresence = {
  listed: "Site informado na fonte",
  verified: "Site próprio confirmado na revisão",
  social: "Somente rede social identificada",
  unlisted: "Site não informado na fonte",
  notFound: "Site não localizado após revisão",
  unverified: "Presença digital não verificada",
} as const;

export function digitalPresence(website: string, reviewedPresence: string | null): keyof typeof resultPresence {
  if (reviewedPresence === "website_not_found") return "notFound";
  if (reviewedPresence === "website_found") return "verified";
  if (reviewedPresence === "social_only") return "social";
  const kind = classifyWebsite(website);
  if (kind === "social") return "social";
  if (kind === "domain" || kind === "platform") return "listed";
  if (reviewedPresence || kind === "invalid") return "unverified";
  return "unlisted";
}

export const resultFilters = z.object({
  visualizacao: z.enum(["cards", "tabela"]).catch("cards"),
  ordem: z.enum(["nome", "score", "bairro", "presenca", "revisao"]).catch("nome"),
  presenca: z.enum(["", "listed", "verified", "social", "unlisted", "notFound", "unverified"]).catch(""),
  revisao: z.enum(["", "pendente", "revisada", "qualificada"]).catch(""),
  bairro: z.string().trim().max(160).catch(""),
  segmento: z.string().trim().max(100).catch(""),
});
