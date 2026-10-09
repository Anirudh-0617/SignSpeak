// Production twin of the Vite dev proxy (vite.config.ts): same path that
// src/translate/translate.ts calls, key injected server-side so it never
// reaches the browser. Set NVIDIA_API_KEY in Vercel → Project → Env Vars.
// ponytail: no rate limiting. Model is pinned and output capped so the public
// endpoint can't be used as a general LLM on our key; add a limiter if abused.
const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b'; // keep in sync with translate.ts
const MAX_TOKENS = 120;
const MAX_N = 3;

export async function POST(req: Request): Promise<Response> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return new Response('missing NVIDIA_API_KEY', { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response('invalid JSON', { status: 400 });
  }

  const res = await fetch(UPSTREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      ...body,
      model: MODEL,
      stream: false,
      max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
      n: Math.min(Number(body.n) || 1, MAX_N),
    }),
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}
