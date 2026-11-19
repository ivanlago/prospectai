import { expect, it } from "vitest";
import { aiCopy, assembleSite, defaultEditor, editorInput, generatedCopy, generationForm, siteContent, suggestedTemplate, toComposedSite } from "../src/features/site-content";
import { estimateMicros } from "../src/integrations/ai/gemini";

const copy = { headline: "Conheça nosso espaço", subtitle: "Uma apresentação dos serviços.", about: "Informações comerciais para sua revisão.", action: "Saiba mais" } as const;
const generated = generatedCopy.parse({
  ...copy, valueProposition: "Uma apresentação dos serviços.", serviceDescriptions: [{ index: 0, description: "Conheça o serviço." }],
  seo: { title: "Conheça a oficina", description: "Uma apresentação dos serviços." },
  tone: "neutro", images: ["ambiente"], optionalSections: ["galeria"],
});
const company = { name: "Oficina", segment: "Oficina", city: "Salvador", state: "BA", address: "" };
it("sugere o template pelo segmento e prioriza odontologia sobre clínica geral", () => {
  expect(["Salão de beleza", "Padaria", "Oficina", "Clínica", "Clínica odontológica", "Saúde bucal", "Contabilidade"].map(suggestedTemplate))
    .toEqual(["salon", "food", "auto", "health", "dental", "dental", "services"]);
});
it("rejeita HTML, alegações numéricas e campos inventados", () => {
  expect(aiCopy.safeParse({ ...copy, headline: "<script>Oi</script>" }).success).toBe(false);
  expect(aiCopy.safeParse({ ...copy, about: "Atuamos há 10 anos no setor." }).success).toBe(false);
  expect(aiCopy.safeParse({ ...copy, phone: "000" }).success).toBe(false);
});
it("exige consentimento e preserva apenas serviços confirmados", () => {
  expect(generationForm.safeParse({ template: "auto", serviceLines: "" }).success).toBe(false);
  const form = generationForm.parse({ template: "auto", serviceLines: "Manutenção\n\nRevisão", authorize: "on" });
  const content = assembleSite(company, form.serviceLines, form.benefitLines, generated);
  expect(content?.services).toEqual(["Manutenção", "Revisão"]);
  expect(content?.seo.title).toBe("Conheça a oficina");
  expect(content?.version).toBe(1);
  expect(estimateMicros(300, 110)).toBe(240);
});

it("impede descrições duplicadas ou de serviços ausentes e rejeita mídia externa", () => {
  expect(assembleSite(company, [], [], generated)).toBeUndefined();
  expect(generatedCopy.safeParse({ ...generated, serviceDescriptions: [...generated.serviceDescriptions, ...generated.serviceDescriptions] }).success).toBe(false);
  expect(generatedCopy.safeParse({ ...generated, images: ["https://example.test/foto.png"] }).success).toBe(false);
  expect(generatedCopy.safeParse({ ...generated, optionalSections: ["depoimentos"] }).success).toBe(false);
});

it("lê documentos antigos e recusa versões desconhecidas ou incompletas", () => {
  const legacy = { ...company, services: [], copy, seo: { title: "Oficina", description: "Descrição" } };
  expect(siteContent.safeParse(legacy).success).toBe(true);
  expect(siteContent.safeParse({ ...legacy, version: 1 }).success).toBe(false);
  expect(siteContent.safeParse({ ...legacy, version: 2 }).success).toBe(false);
});

it("abre documentos antigos no editor e controla os valores editáveis", () => {
  const legacy = siteContent.parse({ ...company, services: [], copy, seo: { title: "Oficina", description: "Descrição" } });
  const document = toComposedSite(legacy);
  const editor = defaultEditor(document, "auto");
  const data = { copy, valueProposition: document.valueProposition, serviceDescriptions: [], editor, removePhoto: false };
  expect(editorInput.safeParse(data).success).toBe(true);
  expect(editorInput.safeParse({ ...data, editor: { ...editor, palette: "url(invalid)" } }).success).toBe(false);
  expect(editorInput.safeParse({ ...data, editor: { ...editor, hidden: ["hero"] } }).success).toBe(false);
  expect(editorInput.safeParse({ ...data, copy: { ...copy, headline: "<img>" } }).success).toBe(false);
  expect(editorInput.safeParse({ ...data, photo: "https://example.test/photo" }).success).toBe(false);
});
