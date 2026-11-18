import { z } from "zod";

export const presenceLabels = {
  unknown: "Desconhecida",
  website_found: "Site próprio encontrado",
  website_not_listed: "Site ausente na fonte",
  website_not_found: "Site não localizado na revisão",
  social_only: "Somente rede social localizada",
  needs_review: "Precisa de revisão",
  verification_failed: "Falha na verificação",
} as const;

const socialDomains = ["facebook.com", "instagram.com", "tiktok.com", "linkedin.com", "youtube.com", "wa.me", "whatsapp.com", "x.com", "twitter.com"];
const platformDomains = ["linktr.ee", "wixsite.com", "wordpress.com", "business.site", "sites.google.com", "booking.com", "tripadvisor.com", "bio.site"];

export function classifyWebsite(value: string) {
  if (!value.trim()) return "unlisted";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return "invalid";
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (socialDomains.some(domain => host === domain || host.endsWith("." + domain))) return "social";
    if (platformDomains.some(domain => host === domain || host.endsWith("." + domain))) return "platform";
    return "domain";
  } catch {
    return "invalid";
  }
}

const weight = z.coerce.number().int().min(0).max(100);
export const reviewForm = z.object({
  presence: z.enum(["unknown", "website_found", "website_not_listed", "website_not_found", "social_only", "needs_review", "verification_failed"]),
  evidence: z.string().trim().min(12).max(1000),
  website: z.string().trim().max(2048),
  gapWeight: weight,
  infoWeight: weight,
  priorityWeight: weight,
  regionWeight: weight,
  staleWeight: weight,
  threshold: weight,
  information: z.literal("on").optional(),
  priority: z.literal("on").optional(),
  region: z.literal("on").optional(),
  stale: z.literal("on").optional(),
}).superRefine((input, context) => {
  const kind = classifyWebsite(input.website);
  if (kind === "invalid" || (input.presence === "website_found" && kind !== "domain") ||
      (input.presence === "social_only" && kind !== "social") ||
      (["website_not_listed", "website_not_found"].includes(input.presence) && kind !== "unlisted")) {
    context.addIssue({ code: "custom", message: "Use uma URL compatível com a situação escolhida.", path: ["website"] });
  }
});

export type Review = z.infer<typeof reviewForm>;

export function assessOpportunity(input: Review) {
  const gap = input.presence === "website_not_found" || input.presence === "social_only";
  const confirmed = gap || input.presence === "website_found";
  const factors = [
    { label: "Sem site próprio localizado na revisão", points: gap ? input.gapWeight : 0 },
    { label: "Informações comerciais confirmadas", points: input.information ? input.infoWeight : 0 },
    { label: "Segmento prioritário", points: input.priority ? input.priorityWeight : 0 },
    { label: "Região prioritária", points: input.region ? input.regionWeight : 0 },
    { label: "Site aparentemente desatualizado", points: input.stale && input.presence === "website_found" ? input.staleWeight : 0 },
  ];
  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const settings = { gapWeight: input.gapWeight, infoWeight: input.infoWeight, priorityWeight: input.priorityWeight,
    regionWeight: input.regionWeight, staleWeight: input.staleWeight, threshold: input.threshold,
    information: input.information, priority: input.priority, region: input.region, stale: input.stale };
  return { score, qualified: confirmed && score >= input.threshold, breakdown: { factors, confidence: confirmed ? "moderada" : "baixa", threshold: input.threshold, settings } };
}
