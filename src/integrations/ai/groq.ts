import { z } from "zod";
import { copySchema, maxEstimatedInputTokens, maxOutputTokens, parseCopy, providerError, readAiJson, systemPrompt, type SiteAiAdapter } from "./site-ai";

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
  return {
    id: "groq",
    label: "Groq",
    model,
    estimateMicros,
    reservedMicros: estimateMicros(maxEstimatedInputTokens, maxOutputTokens),
    async generate(input) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify(input) }],
          max_completion_tokens: maxOutputTokens,
          reasoning_effort: "low",
          response_format: { type: "json_schema", json_schema: { name: "site_copy", strict: true, schema: copySchema } },
        }),
      });
      if (!response.ok) return providerError(response);
      const parsed = envelope.safeParse(await readAiJson(response)).data;
      const tokens = { inputTokens: parsed?.usage?.prompt_tokens, outputTokens: parsed?.usage?.completion_tokens };
      const choice = parsed?.choices?.[0];
      const copy = choice?.finish_reason === "stop" && choice.message.content ? parseCopy(choice.message.content) : undefined;
      return copy ? { ...tokens, copy } : { ...tokens, error: "invalid" };
    },
  };
}
