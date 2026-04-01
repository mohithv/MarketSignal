type SentimentResponse = {
  sentiment: string;
  confidence: number;
};

export async function analyzeSentiment(text: string): Promise<SentimentResponse> {
  const url = process.env.CLAWDBOT_URL;
  if (!url || url.trim().length === 0) {
    throw new Error('Missing required env var: CLAWDBOT_URL');
  }

  const apiKey = process.env.CLAWDBOT_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Missing required env var: CLAWDBOT_API_KEY');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sentiment API error (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as SentimentResponse;
}