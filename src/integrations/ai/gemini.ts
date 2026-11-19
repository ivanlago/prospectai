import { z } from "zod";
import { editRequest, generationRequest, maxEstimatedInputTokens, maxOutputTokens, providerError, readAiJson, type SiteAiAdapter, type StructuredRequest, type StructuredResult } from "./site-ai";

const model = "gemini-3.1-flash-lite";
const usageSchema = z.object({
  promptTokenCount: z.number().int().nonnegative(),
  candidatesTokenCount: z.number().int().nonnegative().default(0),
  thoughtsTokenCount: z.number().int().nonnegative().default(0),
});
const envelope = z.object({
  candidates: z.array(z.object({
    finishReason: z.string(),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
  })).optional(),
  usageMetadata: usageSchema.optional(),
});

export const estimateMicros = (input: number, output: number) => Math.ceil(input * 0.25 + output * 1.5);

export function gemini(): SiteAiAdapter | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  async function request<T>(input: unknown, contract: StructuredRequest<T>, apiKey: string): Promise<StructuredResult<T>> {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: contract.prompt }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: {
            maxOutputTokens, candidateCount: 1, thinkingConfig: { thinkingLevel: "minimal" },
            responseMimeType: "application/json", responseJsonSchema: contract.schema,
          },
        }),
      });
      if (!response.ok) return providerError(response);
      const parsed = envelope.safeParse(await readAiJson(response)).data;
      const usage = parsed?.usageMetadata;
      const tokens = { inputTokens: usage?.promptTokenCount,
        outputTokens: usage ? usage.candidatesTokenCount + usage.thoughtsTokenCount : undefined };
      const candidate = parsed?.candidates?.[0];
      if (candidate?.finishReason !== "STOP") return { ...tokens, error: "invalid" };
      const text = candidate.content.parts.filter(part => !part.thought).map(part => part.text ?? "").join("");
      const value = contract.parse(text);
      return value ? { ...tokens, value } : { ...tokens, error: "invalid" };
  }
  return {
    id: "gemini", label: "Gemini", model, estimateMicros,
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
