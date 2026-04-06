let yahooFinancePromise: Promise<typeof import('yahoo-finance2').default> | null = null;

async function getYahooFinance() {
  if (!yahooFinancePromise) {
    yahooFinancePromise = import('yahoo-finance2').then((m) => m.default);
  }
  return yahooFinancePromise;
}

type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

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
    const yahooFinance = (await getYahooFinance()) as unknown as { quote: (s: string) => Promise<YahooQuote> };
    const data = await yahooFinance.quote(symbol);

    return {
      symbol: data.symbol,
      price: data.regularMarketPrice,
      change: data.regularMarketChange ?? undefined,
      percent: data.regularMarketChangePercent ?? undefined,
    };
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}

export async function getPrices(stocks: SimpleStock[]): Promise<PriceInfo[]> {
  const results = await Promise.all(
    stocks.map(async (stock) => {
      try {
        const yahooFinance = (await getYahooFinance()) as unknown as { quote: (s: string) => Promise<YahooQuote> };
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