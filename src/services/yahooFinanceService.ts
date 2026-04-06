export type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

export type YahooFinanceClient = {
  quote: (symbol: string | string[]) => Promise<YahooQuote | YahooQuote[]>;
};

let yahooInstance: YahooFinanceClient | null = null;

export async function getYahooFinance(): Promise<YahooFinanceClient> {
  if (!yahooInstance) {
    const mod = await import('yahoo-finance2');
    yahooInstance = mod.default as unknown as YahooFinanceClient;
  }
  return yahooInstance;
}

export async function quoteBatch(symbols: string[]): Promise<YahooQuote[]> {
  const yahoo = await getYahooFinance();
  const res = await yahoo.quote(symbols);
  return Array.isArray(res) ? res : [res];
}
