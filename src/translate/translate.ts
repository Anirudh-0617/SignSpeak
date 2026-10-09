// NVIDIA free-tier LLM call. The Vite dev proxy (vite.config.ts) and, in
// production, the Vercel function (api/nvidia/v1/chat/completions.ts) inject
// the Authorization header so the API key never enters the client bundle.
const ENDPOINT = '/api/nvidia/v1/chat/completions';
// nemotron-mini-4b-instruct reached EOL 2026-08-26 (410 Gone).
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';

const SYSTEM = [
  'You receive raw sign-language glosses transcribed from ASL.',
  'Glosses are uppercase tokens separated by spaces.',
  'Fingerspelled input is a run of single letters (e.g. "H E L L O").',
  'Return one grammatical English sentence that plausibly matches the glosses.',
  'Every gloss word must appear in the output or map to a natural English equivalent — never drop a gloss.',
  'No preamble, no quotes, no commentary. Output the sentence only.',
  '',
  'Examples:',
  'MOTHER SCHOOL WATER → Mother is at school getting water.',
  'HELLO NO PLEASE → Hello, no thank you please.',
  'H E L L O → Hello.',
  'YES HAPPY TIRED SLEEP → Yes, I am happy but tired and want to sleep.',
].join('\n');

export async function translate(gloss: string): Promise<string[]> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: gloss.trim() },
      ],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 120,
      n: 3,
      // Reasoning model — thinking off: we want the sentence only, fast.
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  if (!res.ok) throw new Error(`translate failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const texts = (data.choices ?? [])
    .map((c) => c.message?.content?.trim())
    .filter((s): s is string => !!s);
  if (texts.length === 0) throw new Error('translate: empty response');
  // Dedup — some providers return identical candidates at low n / low temp.
  return Array.from(new Set(texts));
}
