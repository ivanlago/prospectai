import { z } from "zod";
import { companyKey } from "../../domain";

const stateNames = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
} as const;

const categories = {
  cafe: { label: "Cafeterias", key: "amenity", value: "cafe" },
  restaurant: { label: "Restaurantes", key: "amenity", value: "restaurant" },
  hairdresser: { label: "Salões de beleza", key: "shop", value: "hairdresser" },
  beauty: { label: "Estética", key: "shop", value: "beauty" },
  repair: { label: "Oficinas automotivas", key: "shop", value: "car_repair" },
  clinic: { label: "Clínicas", key: "amenity", value: "clinic" },
  dentist: { label: "Dentistas", key: "amenity", value: "dentist" },
  bakery: { label: "Padarias", key: "shop", value: "bakery" },
  gym: { label: "Academias", key: "leisure", value: "fitness_centre" },
} as const;

export const categoryOptions = Object.entries(categories).map(([value, { label }]) => ({ value, label }));
export const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
const stateOptions = Object.entries(stateNames);
const segmentKey = z.enum(Object.keys(categories) as [keyof typeof categories, ...(keyof typeof categories)[]]);
const inputText = z.string().trim().max(100).regex(/^[\p{L}\p{M}\p{N} .,'’()-]*$/u);

export const osmFilters = z.object({
  city: inputText.min(1), state: inputText.min(1), category: segmentKey,
  keyword: inputText, region: inputText, limit: z.number().int().min(1).max(50),
  presence: z.enum(["any", "with", "without"]),
}).refine(value => Boolean(findState(value.state)), { path: ["state"] });

export type DiscoveryFilters = z.infer<typeof osmFilters>;
export type BusinessResult = { reference: string; name: string; website: string; district: string; identityKey: string };
export type BusinessSearchProvider = {
  id: string;
  search(input: DiscoveryFilters, signal?: AbortSignal): Promise<{ results: BusinessResult[]; truncated: boolean }>;
};

function findState(value: string) {
  return stateOptions.find(([code, name]) => [normalize(code), normalize(name)].includes(normalize(value)));
}

const scanLimit = 251;

export function overpassQuery(input: DiscoveryFilters) {
  const state = findState(input.state)?.[0];
  const category = categories[input.category];
  return `[out:json][timeout:12][maxsize:33554432];area["ISO3166-2"="BR-${state}"]->.uf;relation(area.uf)["boundary"="administrative"]["admin_level"="8"]["name"=${JSON.stringify(input.city)}];map_to_area->.cidade;nwr(area.cidade)["${category.key}"="${category.value}"]["name"];out tags ${scanLimit};`;
}

const responseSchema = z.object({
  remark: z.string().optional(),
  elements: z.array(z.unknown()).max(scanLimit),
});
const elementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  tags: z.record(z.string(), z.string()),
});

function safeWebsite(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? value : "";
  } catch {
    return "";
  }
}

export function parseOverpass(payload: unknown, input: DiscoveryFilters) {
  const body = responseSchema.parse(payload);
  if (body.remark) throw new ProviderError("partial");
  const results: BusinessResult[] = [];
  const seen = new Set<string>();
  for (const raw of body.elements.slice(0, scanLimit - 1)) {
    const item = elementSchema.safeParse(raw).data;
    const name = item?.tags.name?.trim();
    if (!item || !name || name.length > 160) continue;
    const websiteTag = item.tags.website?.trim() || item.tags["contact:website"]?.trim() || "";
    const website = safeWebsite(websiteTag);
    const district = (item.tags["addr:suburb"] || item.tags["addr:neighbourhood"] || item.tags["addr:district"] || "").slice(0, 160);
    if (input.region && normalize(district) !== normalize(input.region)) continue;
    if (input.keyword && !normalize(name).includes(normalize(input.keyword))) continue;
    if ((input.presence === "with" && !websiteTag) || (input.presence === "without" && websiteTag)) continue;
    const reference = `${item.type}/${item.id}`;
    if (seen.has(reference)) continue;
    seen.add(reference);
    const state = findState(input.state);
    const identityKey = companyKey({ name, city: input.city, state: state?.[1] ?? input.state, country: "Brasil", segment: "", address: "", website, contact: "", notes: "" });
    results.push({ reference, name, website, district, identityKey });
  }
  return { results: results.slice(0, input.limit), truncated: body.elements.length >= scanLimit || results.length > input.limit };
}

export class ProviderError extends Error {
  constructor(public readonly code: string) { super(code); }
}

async function readBounded(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError("invalid");
  const decoder = new TextDecoder();
  let content = "";
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(content + decoder.decode()) as unknown;
      bytes += value.byteLength;
      if (bytes > 1500000) throw new ProviderError("limit");
      content += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export const osmProvider: BusinessSearchProvider = {
  id: "openstreetmap",
  async search(input, signal) {
    const timeout = AbortSignal.timeout(18000);
    const response = await fetch("https://overpass.private.coffee/api/interpreter", {
      method: "POST",
      headers: { Accept: "application/json", "User-Agent": "ProspectAI/0.2 (pesquisa manual com baixo volume)" },
      body: new URLSearchParams({ data: overpassQuery(input) }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "error",
      cache: "no-store",
    });
    if ([406, 429].includes(response.status)) throw new ProviderError("busy");
    if (!response.ok) throw new ProviderError("upstream");
    return parseOverpass(await readBounded(response), input);
  },
};

export const osmEnabled = () => process.env.ENABLE_OSM_PILOT === "true";
