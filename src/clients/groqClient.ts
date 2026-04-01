import Groq from 'groq-sdk';
import { env } from '../config/env.js';

const client = new Groq({ apiKey: env.GROQ_API_KEY });

const SYSTEM_PROMPT =
  'You are a financial analysis assistant that explains screening results clearly for a retail investor. You summarize key metrics, highlight interesting stocks, and mention major risks. Do not give personal investment advice or guarantees.';

const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

export async function analyzeWithGroq(prompt: string): Promise<string> {
  const candidates = [env.GROQ_MODEL, ...FALLBACK_MODELS].filter(
    (model, idx, arr) => model && arr.indexOf(model) === idx
  );

  let lastErr = '';

  for (const model of candidates) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });

      const content = completion.choices?.[0]?.message?.content;
      const text = (content ?? '').trim();
      return text.length > 0 ? text : 'No analysis text returned by Groq.';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErr = msg;
      if (!/model_decommissioned|not supported|does not exist/i.test(msg)) {
        throw new Error(`Groq analysis failed: ${msg}`);
      }
    }
  }

  throw new Error(
    `Groq analysis failed: no available model from configured/fallback list. Last error: ${lastErr}`
  );
}
