import { getYahooFinance, quoteBatch, type YahooQuote } from './yahooFinanceService.js';

export type SimpleStock = {
  name: string;
  symbol: string;
};

export type StockPrice = {
  symbol?: string;
  price: number | null;
  change: number | null;
  percent: number | null;
};

export type PriceInfo = {
  name: string;
  price: number | null;
  change: number | null;
};

// 🔥 Single stock fetch (safe + typed)
export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const yahooFinance = (await getYahooFinance()) as any;

    const data = await yahooFinance.quote(symbol);
    const q = (Array.isArray(data) ? data[0] : data) as YahooQuote;

    return {
      symbol: q?.symbol,
      price: q?.regularMarketPrice ?? null,
      change: q?.regularMarketChange ?? null,
      percent: q?.regularMarketChangePercent ?? null,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// 🔥 Batch fetch (handles array + object responses)
export async function getPrices(stocks: SimpleStock[]): Promise<PriceInfo[]> {
  try {
    const symbols = stocks.map((s) => s.symbol);

    const rawData = await quoteBatch(symbols);

    let data: YahooQuote[];

    // ✅ Handle both response formats
    if (Array.isArray(rawData)) {
      data = rawData;
    } else {
      data = symbols.map((sym) => rawData?.[sym]);
    }

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