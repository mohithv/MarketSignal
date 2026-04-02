// src/services/priceService.ts

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export type SimpleStock = {
  name: string;
  symbol: string;
};

export type PriceInfo = {
  name: string;
  price: number | null;
  change: number | null;
};

export async function getPrices(stocks: SimpleStock[]): Promise<PriceInfo[]> {
  const results = await Promise.all(
    stocks.map(async (stock) => {
      try {
        const data = await yahooFinance.quote(stock.symbol);

        return {
          name: stock.name,
          price: data.regularMarketPrice ?? null,
          change: data.regularMarketChangePercent ?? null,
        };
      } catch {
        return {
          name: stock.name,
          price: null,
          change: null,
        };
      }
    })
  );

  return results;
}