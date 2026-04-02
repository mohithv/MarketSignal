export type NewsArticleLike = {
  headline?: string;
};

const WAR_KEYWORDS = [
  'war',
  'conflict',
  'attack',
  'missile',
  'military',
  'airstrike',
  'tension',
  'geopolitical',
  'iran',
  'israel',
  'russia',
  'china',
] as const;

export function warScore(news: NewsArticleLike[]): number {
  let score = 0;

  for (const article of news) {
    const headline = (article.headline ?? '').toLowerCase();
    if (!headline) continue;

    const matched = WAR_KEYWORDS.some((keyword) => headline.includes(keyword));
    if (matched) score += 1;
  }

  return score;
}

export function detectWarEvent(news: NewsArticleLike[], minScore = 1): boolean {
  return warScore(news) >= minScore;
}
