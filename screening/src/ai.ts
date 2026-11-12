/**
 * Layer 4 helper: ask a vision model on NEAR AI Cloud (OpenAI-compatible API) how likely an image is AI-generated.
 * This is ONE weak signal. The decision rules never reject on this score alone.
 */
export interface AiScoreOptions {
  apiKey: string;
  model: string;
  baseUrl?: string; // default NEAR AI Cloud endpoint, overridable via env
  fetchImpl?: typeof fetch;
}

export async function aiLikelihood(jpegBase64: string, opts: AiScoreOptions): Promise<number | null> {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ?? "https://cloud-api.near.ai/v1";
  try {
    const res = await f(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  'Estimate the probability (0 to 1) that this image is AI-generated rather than a camera photograph. ' +
                  'Reply with JSON only: {"ai_likelihood": number, "reason": string}.',
              },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseLikelihood(json.choices?.[0]?.message?.content ?? "");
  } catch {
    return null;
  }
}

export function parseLikelihood(text: string): number | null {
  const m = text.match(/"ai_likelihood"\s*:\s*([0-9]*\.?[0-9]+)/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}
