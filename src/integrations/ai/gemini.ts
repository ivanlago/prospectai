import { z } from "zod";
import { copySchema, maxEstimatedInputTokens, maxOutputTokens, parseCopy, providerError, readAiJson, systemPrompt, type SiteAiAdapter } from "./site-ai";

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
  return {
    id: "gemini",
    label: "Gemini",
    model,
    estimateMicros,
    reservedMicros: estimateMicros(maxEstimatedInputTokens, maxOutputTokens),
    async generate(input) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: {
            maxOutputTokens, candidateCount: 1, thinkingConfig: { thinkingLevel: "minimal" },
            responseMimeType: "application/json", responseJsonSchema: copySchema,
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
      const copy = parseCopy(text);
      return copy ? { ...tokens, copy } : { ...tokens, error: "invalid" };
    },
  };
}
