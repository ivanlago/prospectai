import { expect, it } from "vitest";
import { aiCopy, assembleSite, generationForm, suggestedTemplate } from "../src/features/site-content";
import { estimateMicros } from "../src/integrations/ai/gemini";

const copy = { headline: "Conheça nosso espaço", subtitle: "Uma apresentação dos serviços.", about: "Informações comerciais para sua revisão.", action: "Saiba mais" } as const;
it("sugere o template pelo segmento e prioriza odontologia sobre clínica geral", () => {
  expect(["Salão de beleza", "Padaria", "Oficina", "Clínica", "Clínica odontológica", "Saúde bucal", "Contabilidade"].map(suggestedTemplate))
    .toEqual(["beauty", "food", "auto", "health", "dental", "dental", "services"]);
});
it("rejeita HTML, alegações numéricas e campos inventados", () => {
  expect(aiCopy.safeParse({ ...copy, headline: "<script>Oi</script>" }).success).toBe(false);
  expect(aiCopy.safeParse({ ...copy, about: "Atuamos há 10 anos no setor." }).success).toBe(false);
  expect(aiCopy.safeParse({ ...copy, phone: "000" }).success).toBe(false);
});
it("exige consentimento e preserva apenas serviços confirmados", () => {
  expect(generationForm.safeParse({ template: "auto", serviceLines: "" }).success).toBe(false);
  const form = generationForm.parse({ template: "auto", serviceLines: "Manutenção\n\nRevisão", authorize: "on" });
  const content = assembleSite({ name: "Oficina", segment: "Oficina", city: "Salvador", state: "BA", address: "" }, form.serviceLines, copy);
  expect(content.services).toEqual(["Manutenção", "Revisão"]);
  expect(content.seo.title).toBe("Oficina");
  expect(estimateMicros(300, 110)).toBe(240);
});
