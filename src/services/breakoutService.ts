import { BreakoutResult } from '../types/trading.js';
import { getNSEQuote } from '../clients/nseClient.js';

export async function checkBreakout(symbol: string): Promise<BreakoutResult | null> {
  try {
    const quote = await getNSEQuote(symbol);

    const current = quote.price;
    const high = quote.high;
    const volume = quote.volume;
    
    if (!current || !high) {
      return null;
    }
    
    // Price breakout (current price >= day high)
    const priceBreakout = current >= high * 0.995; // 99.5% of high to account for precision

    // NSE quote endpoint doesn't provide a 3-month average volume in our current client.
    // We keep breakout detection price-based for now.
    if (priceBreakout && typeof volume === 'number' && volume > 0) {
      return {
        symbol,
        breakout: true,
        price: current,
        timestamp: new Date()
      };
    }
    
    return {
      symbol,
      breakout: false,
      price: current,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`Error checking breakout for ${symbol}:`, error);
    return null;
  }
}

export async function checkMultipleBreakouts(symbols: string[]): Promise<BreakoutResult[]> {
  const promises = symbols.map(symbol => checkBreakout(symbol));
  const results = await Promise.allSettled(promises);
  
  return results
    .filter((result): result is PromiseFulfilledResult<BreakoutResult> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
    .filter(result => result.breakout);
}
