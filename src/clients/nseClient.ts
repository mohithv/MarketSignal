import type { NSEStock, PreOpenResponse } from '../types/trading.js';
import { filterCandidates, filterTopGainers } from '../services/filterService.js';

type NSEQuoteResponse = {
  priceInfo?: {
    lastPrice?: number;
    open?: number;
    intraDayHighLow?: {
      max?: number;
      min?: number;
    };
  };
  securityWiseDP?: {
    deliveryQuantity?: number;
  };
};

export async function getNSEQuote(symbol: string) {
    const url = `https://nseindia.com/api/quote-equity?symbol=${symbol}`;
  
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });
  
  const data = (await res.json()) as NSEQuoteResponse;
  
    return {
    price: data.priceInfo?.lastPrice,
    open: data.priceInfo?.open,
    high: data.priceInfo?.intraDayHighLow?.max,
    low: data.priceInfo?.intraDayHighLow?.min,
    volume: data.securityWiseDP?.deliveryQuantity
    };
  }

export async function getPreOpenData(): Promise<PreOpenResponse> {
  const res = await fetch('https://nseindia.com/api/market-data-pre-open?key=ALL', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`NSE pre-open fetch failed (${res.status})`);
  }

  return (await res.json()) as PreOpenResponse;
}

export async function getTopMovers(): Promise<NSEStock[]> {
  const data = await getPreOpenData();
  const rows = data.data ?? [];

  const stocks = rows
    .map((item) => {
      const symbol = item.metadata?.symbol;
      const change = item.metadata?.pChange;
      const price = item.metadata?.lastPrice;
      const previousClose = item.metadata?.previousClose;
      const volume = item.metadata?.finalQuantity;
      const marketCap = item.metadata?.marketCap;
      const series = item.metadata?.series;

      if (!symbol) return null;
      if (!Number.isFinite(change) || !Number.isFinite(price)) return null;

      const stock: NSEStock = {
        symbol,
        change,
        price,
        previousClose,
        volume,
        marketCap,
        series,
      };

      return stock;
    })
    .filter((item): item is NSEStock => item !== null);

  return stocks.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export async function getTopGainers(): Promise<NSEStock[]> {
  const movers = await getTopMovers();
  return filterTopGainers(movers);
}

export async function getFilteredCandidates(): Promise<NSEStock[]> {
  const movers = await getTopMovers();
  return filterCandidates(movers);
}