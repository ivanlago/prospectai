import { afterEach, expect, it, vi } from "vitest";
import { groq } from "../src/integrations/ai/groq";
import { siteAiProvider } from "../src/integrations/ai/provider";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("seleciona o provedor configurado sem recorrer a outro", () => {
  vi.stubEnv("AI_PROVIDER", "groq");
  vi.stubEnv("GEMINI_API_KEY", "gemini-fixture");
  vi.stubEnv("GROQ_API_KEY", "");
  expect(siteAiProvider()).toBeNull();
  vi.stubEnv("GROQ_API_KEY", "groq-fixture");
  expect(siteAiProvider()?.model).toBe("openai/gpt-oss-20b");
});

it("envia o esquema ao Groq e preserva tokens da resposta", async () => {
  vi.stubEnv("GROQ_API_KEY", "groq-fixture");
  const copy = {
    headline: "Bem-vindo à oficina", subtitle: "Conheça nosso espaço e proposta.", about: "Informações para revisar.", action: "Saiba mais",
    valueProposition: "Conheça a proposta da oficina.", serviceDescriptions: [],
    seo: { title: "Conheça a oficina", description: "Uma apresentação da oficina." }, tone: "neutro", images: [], optionalSections: [],
  };
  const fetchMock = vi.fn().mockResolvedValue(Response.json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(copy) } }],
    usage: { prompt_tokens: 300, completion_tokens: 110 },
  }));
  vi.stubGlobal("fetch", fetchMock);
  const adapter = groq();
  expect(await adapter?.generate({ name: "Oficina", segment: "Automotivo", services: [] })).toEqual({ copy, inputTokens: 300, outputTokens: 110 });
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
  expect(JSON.parse(request.body).response_format.json_schema.strict).toBe(true);
  expect(adapter?.estimateMicros(300, 110)).toBe(56);
});

it("recusa resposta incompleta e mantém o consumo reportado pelo provedor", async () => {
  vi.stubEnv("GROQ_API_KEY", "groq-fixture");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ headline: "Texto incompleto" }) } }],
    usage: { prompt_tokens: 40, completion_tokens: 10 },
  })));
  expect(await groq()?.generate({ name: "Oficina", segment: "Automotivo", services: [] }))
    .toEqual({ error: "invalid", inputTokens: 40, outputTokens: 10 });
});

it("usa o contrato de operações separado para editar pelo Groq", async () => {
  vi.stubEnv("GROQ_API_KEY", "groq-fixture");
  const proposal = { operations: [{ field: "font", value: "serifa" }] };
  const fetchMock = vi.fn().mockResolvedValue(Response.json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(proposal) } }],
    usage: { prompt_tokens: 95, completion_tokens: 18 },
  }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await groq()?.edit({ instruction: "Use uma fonte com serifa.", site: { font: "template" } }))
    .toEqual({ proposal, inputTokens: 95, outputTokens: 18 });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).response_format.json_schema.name).toBe("site_edit");
});
