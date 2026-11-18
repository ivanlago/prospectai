import { z } from "zod";

export const templates = {
  beauty: { label: "Beleza e estética", accent: "#913a60", background: "#f9eaf0", style: "editorial" },
  food: { label: "Restaurantes e cafeterias", accent: "#994021", background: "#fbebd7", style: "banner" },
  auto: { label: "Oficinas e serviços automotivos", accent: "#154a78", background: "#e7eff7", style: "industrial" },
  health: { label: "Clínicas e consultórios", accent: "#116051", background: "#e5f5ef", style: "clinical" },
  services: { label: "Serviços profissionais", accent: "#51408a", background: "#f0ecfb", style: "professional" },
} as const;

export const templateId = z.enum(["beauty", "food", "auto", "health", "services"]);
export type TemplateId = z.infer<typeof templateId>;

export function suggestedTemplate(segment: string): TemplateId {
  const normalized = segment.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/clinica|consultorio|dentista|medic|saude/.test(normalized)) return "health";
  if (/estetica|salao|beleza|barbear/.test(normalized)) return "beauty";
  if (/restaurante|cafeteria|padaria|aliment/.test(normalized)) return "food";
  if (/oficina|automot|mecanica/.test(normalized)) return "auto";
  return "services";
}

const prose = (max: number) => z.string().trim().min(5).max(max).refine(
  value => !/[<>]|https?:\/\/|www\.|\b\d+\b|\b(?:certificad[oa]s?|premiad[oa]s?|garantid[oa]s?|depoimentos?|avaliações)\b/i.test(value),
  "A geração deve usar texto simples e evitar alegações não confirmadas.",
);
const publicLine = z.string().trim().min(1).max(160);
const email = z.union([z.email().max(254), z.literal("")]).default("");
const whatsapp = z.string().trim().regex(/^(?:[1-9]\d{9,14})?$/).default("");
export const aiCopy = z.object({
  headline: prose(100),
  subtitle: prose(180),
  about: prose(420),
  action: z.enum(["Conheça os serviços", "Saiba mais"]),
}).strict();

export const siteContent = z.object({
  name: publicLine, segment: publicLine, city: publicLine, state: publicLine,
  address: z.string().trim().max(300),
  email, whatsapp,
  services: z.array(publicLine).max(8),
  copy: aiCopy,
  seo: z.object({ title: z.string().max(160), description: z.string().max(180) }),
});

export const generationForm = z.object({
  template: templateId,
  serviceLines: z.string().max(1100).transform(value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(120)).max(8)),
  includeAddress: z.literal("on").optional(),
  email, whatsapp,
  authorize: z.literal("on"),
});

export type SiteContent = z.infer<typeof siteContent>;

export function assembleSite(company: { name: string; segment: string; city: string; state: string; address: string; email?: string; whatsapp?: string },
  services: string[], copy: z.infer<typeof aiCopy>): SiteContent {
  return siteContent.parse({ ...company, services, copy,
    seo: { title: company.name, description: copy.subtitle },
  });
}
