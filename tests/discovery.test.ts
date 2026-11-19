import { afterEach, describe, expect, it, vi } from "vitest";
import { osmFilters, osmProvider, overpassQuery, parseOverpass } from "../src/integrations/discovery/overpass";
import { digitalPresence, resultFilters } from "../src/features/discovery-results";

const filters = osmFilters.parse({ city: "Salvador", state: "Bahia", category: "cafe", keyword: "", region: "", limit: 30, presence: "any" });
const cafe = (id: number, name: string, tags: Record<string, string> = {}) => ({ type: "node", id, tags: { name, amenity: "cafe", ...tags } });

afterEach(() => vi.unstubAllGlobals());

describe("Descoberta por OpenStreetMap", () => {
  it("distingue evidência de revisão da informação disponível na fonte", () => {
    expect(digitalPresence("", null)).toBe("unlisted");
    expect(digitalPresence("", "website_not_found")).toBe("notFound");
    expect(digitalPresence("", "website_found")).toBe("verified");
    expect(digitalPresence("", "verification_failed")).toBe("unverified");
    expect(digitalPresence("https://instagram.com/cafe", null)).toBe("social");
    expect(digitalPresence("https://example.test", null)).toBe("listed");
    expect(resultFilters.parse({ visualizacao: ["tabela", "cards"], presenca: "invalid" }))
      .toMatchObject({ visualizacao: "cards", presenca: "" });
  });
  it("delimita município e UF sem aceitar metacaracteres de consulta", () => {
    expect(overpassQuery(filters)).toContain('["ISO3166-2"="BR-BA"]');
    expect(overpassQuery(filters)).toContain('["name"="Salvador"]');
    expect(osmFilters.safeParse({ ...filters, city: 'X"];out;' }).success).toBe(false);
    expect(osmFilters.safeParse({ ...filters, state: "XX" }).success).toBe(false);
  });

  it("filtra por bairro, palavra-chave e ausência de site na fonte", () => {
    const result = parseOverpass({ elements: [
      cafe(1, "Café Roma", { "addr:suburb": "Nazaré" }),
      cafe(2, "Café Paris", { "addr:suburb": "Nazaré", website: "https://example.test" }),
      cafe(3, "Café Roma", { "addr:suburb": "Barra" }),
      cafe(1, "Café Roma", { "addr:suburb": "Nazaré" }),
    ] }, { ...filters, region: "Nazare", keyword: "cafe", presence: "without" });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ reference: "node/1", name: "Café Roma", website: "" });
  });

  it("limita resultados, rejeita esquema inesperado e descarta URLs perigosas", () => {
    const payload = { elements: [cafe(1, "Café", { website: "javascript:alert(0)" }), cafe(2, "Outra")] };
    const result = parseOverpass(payload, { ...filters, limit: 1 });
    expect(result.truncated).toBe(true);
    expect(result.results[0].website).toBe("");
    expect(() => parseOverpass({ elements: {}, remark: "oops" }, filters)).toThrow();
    expect(() => parseOverpass({ elements: [], remark: "timeout" }, filters)).toThrow("partial");
  });

  it("trata limite do provedor sem repetir chamadas", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(osmProvider.search(filters)).rejects.toMatchObject({ code: "busy" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("processa a resposta JSON da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ elements: [cafe(17, "Café local")] })));
    await expect(osmProvider.search(filters)).resolves.toMatchObject({
      truncated: false, results: [{ reference: "node/17", name: "Café local" }],
    });
  });
});
