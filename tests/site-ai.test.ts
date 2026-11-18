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
  const copy = { headline: "Bem-vindo à oficina", subtitle: "Conheça nosso espaço e proposta.", about: "Informações para revisar.", action: "Saiba mais" };
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
