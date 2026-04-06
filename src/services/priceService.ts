import { getYahooFinance, quoteBatch, type YahooQuote } from './yahooFinanceService.js';

export type SimpleStock = {
  name: string;
  symbol: string;
};

export type StockPrice = {
  symbol?: string;
  price?: number;
  change?: number;
  percent?: number;
};

export type PriceInfo = {
  name: string;
  price: number | null;
  change: number | null;
};

export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const yahooFinance = await getYahooFinance();
    const data = await yahooFinance.quote(symbol);
    const q = (Array.isArray(data) ? data[0] : data) as YahooQuote;

    return {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? undefined,
      percent: q.regularMarketChangePercent ?? undefined,
    };
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}

export async function getPrices(stocks: SimpleStock[]): Promise<PriceInfo[]> {
  try {
    const symbols = stocks.map((s) => s.symbol);
    const data = await quoteBatch(symbols);

    return stocks.map((stock, index) => {
      const q = data[index];
      return {
        name: stock.name,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChangePercent ?? null,
      };
    });
  } catch (error) {
    console.error('Batch fetch error:', error);
    return stocks.map((stock) => ({
      name: stock.name,
      price: null,
      change: null,
    }));
  }
}