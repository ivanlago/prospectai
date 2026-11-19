import { z } from "zod";
import { editRequest, generationRequest, maxEstimatedInputTokens, maxOutputTokens, providerError, readAiJson, type SiteAiAdapter, type StructuredRequest, type StructuredResult } from "./site-ai";

const model = "openai/gpt-oss-20b";
const estimateMicros = (input: number, output: number) => Math.ceil((input * 75 + output * 300) / 1000);
const envelope = z.object({
  choices: z.array(z.object({
    finish_reason: z.string(),
    message: z.object({ content: z.string().nullable() }),
  })).optional(),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative() }).optional(),
});

export function groq(): SiteAiAdapter | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  async function request<T>(input: unknown, contract: StructuredRequest<T>, apiKey: string): Promise<StructuredResult<T>> {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: contract.prompt }, { role: "user", content: JSON.stringify(input) }],
          max_completion_tokens: maxOutputTokens,
          reasoning_effort: "low",
          response_format: { type: "json_schema", json_schema: { name: contract.name, strict: true, schema: contract.schema } },
        }),
      });
      if (!response.ok) return providerError(response);
      const parsed = envelope.safeParse(await readAiJson(response)).data;
      const tokens = { inputTokens: parsed?.usage?.prompt_tokens, outputTokens: parsed?.usage?.completion_tokens };
      const choice = parsed?.choices?.[0];
      const value = choice?.finish_reason === "stop" && choice.message.content ? contract.parse(choice.message.content) : undefined;
      return value ? { ...tokens, value } : { ...tokens, error: "invalid" };
  }
  return {
    id: "groq", label: "Groq", model, estimateMicros,
    reservedMicros: estimateMicros(maxEstimatedInputTokens, maxOutputTokens),
    async generate(input) {
      const { value, ...usage } = await request(input, generationRequest, key);
      return value ? { ...usage, copy: value } : usage;
    },
    async edit(input) {
      const { value, ...usage } = await request(input, editRequest, key);
      return value ? { ...usage, proposal: value } : usage;
    },
  };
}
