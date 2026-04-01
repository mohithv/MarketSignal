type NewsApiArticle = {
  title?: string;
};

type NewsApiResponse = {
  articles?: NewsApiArticle[];
};

type FetchNewsOptions = {
  country?: string;
  category?: string;
};

export async function fetchNews(opts: FetchNewsOptions = {}): Promise<string[]> {
  const country = (opts.country ?? 'in').trim() || 'in';
  const category = (opts.category ?? 'business').trim() || 'business';

  const apiKey = process.env.NEWS_API_KEY?.trim();
  const url = apiKey
    ? `https://newsapi.org/v2/top-headlines?country=${encodeURIComponent(country)}&apiKey=${encodeURIComponent(apiKey)}`
    : `https://saurav.tech/NewsAPI/top-headlines/category/${encodeURIComponent(category)}/${encodeURIComponent(country)}.json`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`News API error (${res.status}): ${body || res.statusText}`);
  }

  const data = (await res.json()) as NewsApiResponse;
  const articles = data.articles ?? [];
  return articles.map((a) => a.title ?? '').filter((t) => t.trim().length > 0);
}