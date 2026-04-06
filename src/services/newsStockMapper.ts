export type NewsArticle = {
  headline: string;
};

let yahooFinancePromise: Promise<typeof import('yahoo-finance2').default> | null = null;

async function getYahooFinance() {
  if (!yahooFinancePromise) {
    yahooFinancePromise = import('yahoo-finance2').then((m) => m.default);
  }
  return yahooFinancePromise;
}

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export type StockInfo = {
  name: string;
  symbol: string;
  keywords: string[];
};

export type MappedNews = {
  headline: string;
  stock: string;
};

export type PriceInfo = {
  name: string;
  price: number | null;
  change: number | null;
};

export const STOCKS: StockInfo[] = [
  { name: 'TCS', symbol: 'TCS.NS', keywords: ['tcs', 'tata consultancy'] },
  { name: 'INFY', symbol: 'INFY.NS', keywords: ['infosys', 'infy'] },
  { name: 'RELIANCE', symbol: 'RELIANCE.NS', keywords: ['reliance', 'ril'] },
  { name: 'ADANI', symbol: 'ADANIPOWER.NS', keywords: ['adani', 'adani power'] },
  { name: 'HDFC', symbol: 'HDFCBANK.NS', keywords: ['hdfc', 'hdfc bank'] },
  { name: 'ITC', symbol: 'ITC.NS', keywords: ['itc'] },
];

export function mapNewsToStocks(newsInput: NewsArticle[], stocksInput: StockInfo[]): MappedNews[] {
  return newsInput.map((article: NewsArticle) => {
    const headlineLower = article.headline.toLowerCase();

    const matched = stocksInput.find(
      (stock: StockInfo) =>
        headlineLower.includes(stock.name.toLowerCase()) ||
        stock.keywords.some((keyword: string) => headlineLower.includes(keyword))
    );

    return {
      headline: article.headline,
      stock: matched ? matched.name : 'General Market',
    };
  });
}

export async function getPrices(stocksInput: StockInfo[]): Promise<PriceInfo[]> {
  const results = await Promise.all(
    stocksInput.map(async (stock) => {
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