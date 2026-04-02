// src/services/warService.ts

import { getMarketNews } from '../clients/finnhubClient.js';
import { detectWarEvent, warScore, type NewsArticleLike } from './eventDetector.js';
import { WAR_IMPACT } from './sectorImpact.js';
import { getPrices, type PriceInfo } from './priceService.js';

export type WarResult =
  | {
      isWar: false;
      score: number;
    }
  | {
      isWar: true;
      score: number;
      gainers: PriceInfo[];
      losers: PriceInfo[];
    };

export async function runWarAnalysis(): Promise<WarResult> {
  const newsRaw = (await getMarketNews()) as unknown;
  const news = (Array.isArray(newsRaw) ? newsRaw : []) as NewsArticleLike[];
  const topNews = news.slice(0, 5);

  const score = warScore(topNews);

  if (!detectWarEvent(topNews, 2)) {
    return {
      isWar: false,
      score,
    };
  }

  const gainers = await getPrices(WAR_IMPACT.positive);
  const losers = await getPrices(WAR_IMPACT.negative);

  return {
    isWar: true,
    score,
    gainers,
    losers,
  };
}