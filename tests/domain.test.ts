import { describe, expect, it } from "vitest";
import { companyForm, companyKey, searchForm, stages } from "../src/domain";

const company = { name: "Clínica Exemplo", city: "Salvador", state: "Bahia", country: "Brasil", segment: "Saúde" };
const search = { ...company, presence: "without", limit: "20", radius: null, rating: "4.5", reviews: "30" };

describe("Validação dos formulários", () => {
  it("aceita cadastro sem site nem contato", () => {
    expect(companyForm.parse(company)).toMatchObject({ website: "", contact: "" });
  });

  it.each(["javascript:alert(1)", "file:///etc/hosts", "https://user:pass@example.com", "example.com"])("rejeita site inválido %s", website => {
    expect(companyForm.safeParse({ ...company, website }).success).toBe(false);
  });

  it("normaliza a chave de duplicidade", () => {
    expect(companyKey(companyForm.parse(company))).toBe(companyKey(companyForm.parse({ ...company, name: "  CLÍNICA   EXEMPLO " })));
  });

  it("valida os filtros salvos e converte valores numéricos", () => {
    expect(searchForm.parse(search)).toMatchObject({ rating: 4.5, reviews: 30, radius: null, limit: 20 });
    expect(searchForm.safeParse({ ...search, limit: 101 }).success).toBe(false);
    expect(searchForm.safeParse({ ...search, rating: 5.1 }).success).toBe(false);
  });

  it("aceita identificadores internos de etapa", () => {
    expect(stages.safeParse("qualified").success).toBe(true);
    expect(stages.safeParse("Qualificado").success).toBe(false);
  });
});
