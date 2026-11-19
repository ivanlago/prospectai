import { z } from "zod";

export const templates = {
  beauty: { label: "Beleza e estética", accent: "#913a60", background: "#f9eaf0", style: "editorial" },
  salon: { label: "Salões e barbearias", accent: "#b65c2e", background: "#f5e7d8", style: "editorial" },
  food: { label: "Restaurantes e cafeterias", accent: "#994021", background: "#fbebd7", style: "banner" },
  auto: { label: "Oficinas e serviços automotivos", accent: "#154a78", background: "#e7eff7", style: "industrial" },
  health: { label: "Clínicas e consultórios", accent: "#116051", background: "#e5f5ef", style: "clinical" },
  dental: { label: "Clínicas dentárias", accent: "#a12030", background: "#f9efed", style: "clinical" },
  services: { label: "Serviços profissionais", accent: "#51408a", background: "#f0ecfb", style: "professional" },
} as const;

export const templateId = z.enum(["beauty", "salon", "food", "auto", "health", "dental", "services"]);
export type TemplateId = z.infer<typeof templateId>;

export function suggestedTemplate(segment: string): TemplateId {
  const normalized = segment.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/odontolog|dentista|dental|dentari|saude bucal/.test(normalized)) return "dental";
  if (/clinica|consultorio|medic|saude/.test(normalized)) return "health";
  if (/salao|barbear|cabeleireir/.test(normalized)) return "salon";
  if (/estetica|beleza/.test(normalized)) return "beauty";
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

export const visualTones = ["suave", "alto-contraste", "neutro"] as const;
export const imageSubjects = ["ambiente", "equipamentos", "detalhes", "produtos"] as const;
export const optionalSections = ["beneficios", "galeria"] as const;
export const serviceDescription = z.object({ index: z.number().int().min(0).max(7), description: prose(140) }).strict();
const generatedDetails = {
  valueProposition: prose(140),
  serviceDescriptions: z.array(serviceDescription).max(8)
    .refine(items => new Set(items.map(item => item.index)).size === items.length),
  seo: z.object({ title: prose(70), description: prose(160) }).strict(),
  tone: z.enum(visualTones),
  images: z.array(z.enum(imageSubjects)).max(4)
    .refine(items => new Set(items).size === items.length),
  optionalSections: z.array(z.enum(optionalSections)).max(2)
    .refine(items => new Set(items).size === items.length),
};
export const generatedCopy = aiCopy.extend(generatedDetails).strict();

const siteFields = z.object({
  name: publicLine, segment: publicLine, city: publicLine, state: publicLine,
  address: z.string().trim().max(300),
  email, whatsapp,
  photo: z.string().max(700000).regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional(),
  services: z.array(publicLine).max(8),
  copy: aiCopy,
});
const legacySite = siteFields.extend({
  version: z.undefined().optional(),
  seo: z.object({ title: z.string().max(160), description: z.string().max(180) }),
});
export const composedSite = siteFields.extend({ version: z.literal(1), ...generatedDetails, benefits: z.array(publicLine).max(4).default([]) })
  .refine(content => content.serviceDescriptions.every(item => item.index < content.services.length));
export const siteContent = z.union([composedSite, legacySite]);

export const generationForm = z.object({
  template: templateId,
  serviceLines: z.string().max(1100).transform(value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(120)).max(8)),
  benefitLines: z.string().max(500).default("").transform(value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(120)).max(4)),
  includeAddress: z.literal("on").optional(),
  email, whatsapp,
  authorize: z.literal("on"),
});

export type SiteContent = z.infer<typeof siteContent>;
export type ComposedSite = z.infer<typeof composedSite>;

export function assembleSite(company: Pick<z.input<typeof siteFields>, "name" | "segment" | "city" | "state" | "address" | "photo" | "email" | "whatsapp">,
  services: string[], benefits: string[], copy: z.infer<typeof generatedCopy>) {
  const { headline, subtitle, about, action, ...details } = copy;
  return composedSite.safeParse({ ...company, ...details, version: 1, services, benefits, copy: { headline, subtitle, about, action } }).data;
}
