// src/services/warService.ts

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
  const topNews: NewsArticleLike[] = [];

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