import { getTopMovers } from './nseClient.js';
import type { ScreenerFilters, ScreenerResult } from '../types/screener.js';

export async function runScreener(filters: ScreenerFilters): Promise<ScreenerResult[]> {
  const movers = await getTopMovers();
  const limit = Math.max(1, Math.min(200, Math.floor(filters.limit ?? 50)));

  return movers.slice(0, limit).map((row) => ({
    ticker: row.symbol,
    name: row.symbol,
    // NSE pre-open gives a % change; we store it in eps for now
    // to keep compatibility with the existing response shape/UI.
    eps: row.change,
    signals: [row.change >= 0 ? 'preopen_gain' : 'preopen_drop'],
  }));
}
