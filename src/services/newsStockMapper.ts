import { quoteBatch } from './yahooFinanceService.js';

export type NewsArticle = {
  headline: string;
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

// 🔥 Add proper type for Yahoo response
type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export const STOCKS: StockInfo[] = [
  { name: 'TCS', symbol: 'TCS.NS', keywords: ['tcs', 'tata consultancy'] },
  { name: 'INFY', symbol: 'INFY.NS', keywords: ['infosys', 'infy'] },
  { name: 'RELIANCE', symbol: 'RELIANCE.NS', keywords: ['reliance', 'ril'] },
  { name: 'ADANI', symbol: 'ADANIPOWER.NS', keywords: ['adani', 'adani power'] },
  { name: 'HDFC', symbol: 'HDFCBANK.NS', keywords: ['hdfc', 'hdfc bank'] },
  { name: 'ITC', symbol: 'ITC.NS', keywords: ['itc'] },
];

export function mapNewsToStocks(
  newsInput: NewsArticle[],
  stocksInput: StockInfo[]
): MappedNews[] {
  return newsInput.map((article) => {
    const headlineLower = article.headline.toLowerCase();

    const matched = stocksInput.find(
      (stock) =>
        headlineLower.includes(stock.name.toLowerCase()) ||
        stock.keywords.some((keyword) =>
          headlineLower.includes(keyword)
        )
    );

    return {
      headline: article.headline,
      stock: matched ? matched.name : 'General Market',
    };
  });
}

// 🔥 FIXED getPrices
export async function getPrices(
  stocksInput: StockInfo[]
): Promise<PriceInfo[]> {
  try {
    const symbols = stocksInput.map((s) => s.symbol);

    const rawData = await quoteBatch(symbols);

    // 🔥 Handle BOTH array & object response
    let data: YahooQuote[];

    if (Array.isArray(rawData)) {
      data = rawData;
    } else {
      // yahoo-finance2 sometimes returns object keyed by symbol
      data = symbols.map((sym) => rawData[sym]);
    }

    return stocksInput.map((stock, index) => {
      const q = data[index];

      return {
        name: stock.name,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChangePercent ?? null,
      };
    });
  } catch (error) {
    console.error('Batch fetch error:', error);

    return stocksInput.map((stock) => ({
      name: stock.name,
      price: null,
      change: null,
    }));
  }
}