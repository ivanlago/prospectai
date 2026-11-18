import { z } from "zod";

export const stageNames = {
  new: "Novo",
  reviewing: "Em análise",
  qualified: "Qualificado",
  planned: "Contato planejado",
  contacted: "Contatado",
  interested: "Interessado",
  demo: "Demonstração enviada",
  proposed: "Proposta enviada",
  negotiating: "Negociação",
  won: "Convertido",
  lost: "Perdido",
} as const;

export const stageKeys = Object.keys(stageNames) as [keyof typeof stageNames, ...(keyof typeof stageNames)[]];
export const stages = z.enum(stageKeys);
export const id = z.uuid();
const required = z.string().trim().min(1).max(160);
const optional = (max: number) => z.string().trim().max(max).default("");
const website = optional(2048).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
});

export const companyForm = z.object({
  name: required, segment: required, city: required, state: required, country: required,
  address: optional(300), website, contact: optional(300), notes: optional(4000),
});

export const searchForm = z.object({
  name: required, country: required, state: required, city: required,
  region: optional(160), segment: required, keyword: optional(160),
  radius: z.coerce.number().int().min(1).max(50).nullable(),
  rating: z.coerce.number().min(0).max(5).nullable(),
  reviews: z.coerce.number().int().min(0).max(1000000).nullable(),
  presence: z.enum(["any", "with", "without"]),
  limit: z.coerce.number().int().min(1).max(100),
});

export const loginForm = z.object({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export function companyKey(company: z.infer<typeof companyForm>) {
  return JSON.stringify([company.name, company.city, company.state, company.country].map(
    value => value.normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g, " "),
  ));
}

export const formatDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia" }).format;
