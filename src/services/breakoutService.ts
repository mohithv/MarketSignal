import { BreakoutResult } from '../types/trading.js';
import { getNSEQuote } from '../clients/nseClient.js';

/**
 * ================================
 * 🔹 TYPE: Candle (for chart-based analysis)
 * ================================
 */
export type Candle = {
  close: number;
  high: number;
  volume: number;
};

/**
 * ================================
 * 🔹 SINGLE STOCK BREAKOUT (LIVE NSE)
 * ================================
 */
export async function checkBreakout(symbol: string): Promise<BreakoutResult | null> {
  try {
    const quote = await getNSEQuote(symbol);

    const current = quote.price;
    const high = quote.high;
    const volume = quote.volume;

    if (!current || !high) {
      return null;
    }

    // 🔥 Price breakout (near day high)
    const priceBreakout = current >= high * 0.995;

    return {
      symbol,
      breakout: priceBreakout,
      price: current,
      change: quote.change ?? 0,
      confidence: priceBreakout ? 70 : 0,
      timestamp: new Date(),
    };

  } catch (error) {
    console.error(`Error checking breakout for ${symbol}:`, error);
    return null;
  }
}

/**
 * ================================
 * 🔹 MULTIPLE STOCK SCAN
 * ================================
 */
export async function checkMultipleBreakouts(symbols: string[]): Promise<BreakoutResult[]> {
  const promises = symbols.map(symbol => checkBreakout(symbol));

  const results = await Promise.allSettled(promises);

  return results
    .filter((r): r is PromiseFulfilledResult<BreakoutResult> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
    .filter(r => r.breakout);
}

/**
 * ================================
 * 🔹 CANDLE BASED BREAKOUT (ADVANCED)
 * ================================
 */
export function detectBreakout(candles: Candle[], symbol: string) {
  if (candles.length < 20) {
    return {
      symbol,
      breakout: false,
      price: 0,
    };
  }

  const latest = candles[candles.length - 1];
  if (!latest) {
    return {
      symbol,
      breakout: false,
      price: 0,
    };
  }
  const previous = candles.slice(0, -1);

  const resistance = Math.max(...previous.map(c => c.high));
  const breakout = latest.close > resistance;

  return {
    symbol,
    breakout,
    price: latest.close,
  };
}

/**
 * ================================
 * 🔹 VOLUME SPIKE
 * ================================
 */
export function detectVolumeSpike(candles: Candle[]): boolean {
  if (candles.length < 20) return false;

  const latest = candles[candles.length - 1];
  if (!latest) return false;
  const previous = candles.slice(0, -1);

  const avgVolume =
    previous.reduce((sum, c) => sum + c.volume, 0) / previous.length;

  return latest.volume > avgVolume * 1.5;
}

/**
 * ================================
 * 🔹 FINAL ANALYZER (BEST SIGNAL 🔥)
 * ================================
 */
export function analyzeStock(candles: Candle[], symbol: string): BreakoutResult {
  const breakoutData = detectBreakout(candles, symbol);
  const volumeSpike = detectVolumeSpike(candles);

  let confidence = 0;

  if (breakoutData.breakout && volumeSpike) {
    confidence = 90; // 🔥 strongest
  } else if (breakoutData.breakout) {
    confidence = 70;
  }

  return {
    symbol,
    breakout: breakoutData.breakout,
    price: breakoutData.price,
    change: 0, // candle-based doesn't include % change
    confidence,
    timestamp: new Date(),
  };
}