// Production twin of the Vite dev proxy (vite.config.ts): same path that
// src/translate/translate.ts calls, key injected server-side so it never
// reaches the browser. Set NVIDIA_API_KEY in Vercel → Project → Env Vars.
// Abuse guards: model pinned, output capped, request body capped (bounds input
// tokens), and a per-IP rate limit so the public endpoint can't be used as a
// general LLM on our key.
const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b'; // keep in sync with translate.ts
const MAX_TOKENS = 120;
const MAX_N = 3;
const MAX_BODY_BYTES = 8_000; // translate.ts sends ~1.5 KB (few-shot prompt + gloss)
const RATE_LIMIT = 20; // requests per IP per window
const RATE_WINDOW_MS = 10 * 60_000;

// ponytail: in-memory, so it's per function instance, not global. Fluid
// compute reuses warm instances, which makes it effective against a single
// hammering client; a distributed attacker needs Vercel Firewall / Upstash.
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, now: number): boolean {
  const h = hits.get(ip);
  if (!h || now >= h.resetAt) {
    if (hits.size > 5_000) hits.clear(); // bound memory
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  return ++h.count > RATE_LIMIT;
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return new Response('missing NVIDIA_API_KEY', { status: 500 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip, Date.now())) {
    return new Response('rate limited, try again in a few minutes', {
      status: 429,
      headers: { 'Retry-After': String(RATE_WINDOW_MS / 1000) },
    });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response('request too large', { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
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
