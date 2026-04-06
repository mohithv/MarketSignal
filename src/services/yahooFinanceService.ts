export type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
};

export type YahooFinanceClient = {
  quote: (symbol: string | string[]) => Promise<any>;
};

let yahooInstance: YahooFinanceClient | null = null;

// ✅ Stable singleton (important for batch jobs)
export async function getYahooFinance(): Promise<YahooFinanceClient> {
  if (!yahooInstance) {
    const mod = await import("yahoo-finance2");
    yahooInstance = mod.default as unknown as YahooFinanceClient;
  }
  return yahooInstance;
}

// ✅ STRICT batch-safe implementation
export async function quoteBatch(symbols: string[]): Promise<YahooQuote[]> {
  try {
    const yahoo = await getYahooFinance();

    const res = await yahoo.quote(symbols);

    // 🔹 Case 1: Array response
    if (Array.isArray(res)) {
      // Ensure order consistency (VERY IMPORTANT)
      const map = new Map<string, YahooQuote>();

      for (const item of res) {
        if (item?.symbol) {
          map.set(item.symbol, item);
        }
      }

      return symbols.map((sym) => map.get(sym) ?? { symbol: sym });
    }

    // 🔹 Case 2: Object response
    if (res && typeof res === "object") {
      return symbols.map((sym) => {
        const q = res[sym];
        return q ? q : { symbol: sym };
      });
    }

    // 🔹 Unexpected format
    console.warn("Unexpected Yahoo response format:", res);

    return symbols.map((sym) => ({ symbol: sym }));

  } catch (error) {
    console.error("quoteBatch error:", error);

    // 🔥 Always return same length (CRITICAL for batch jobs)
    return symbols.map((sym) => ({ symbol: sym }));
  }
}