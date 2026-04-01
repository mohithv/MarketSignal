import { NSEStock } from '../types/trading.js';

export function filterCandidates(stocks: NSEStock[]): NSEStock[] {
  return stocks
    .filter(s => !s.symbol.includes('-RE'))
    .filter(s => (s.volume ?? 0) > 100000)
    .filter(s => s.change > 0.5 && s.change < 4) // Laggards with potential
    .filter(s => s.price > 50 && s.price < 2000) // Reasonable price range
    .filter(s => (s.buyQty ?? 0) > (s.sellQty ?? 0)*2)
    .slice(0, 5); // Top 5 candidates
}

export function filterTopGainers(stocks: NSEStock[]): NSEStock[] {
  return stocks
    .filter(s => !s.symbol.includes('-RE'))
    .filter(s => (s.volume ?? 0) > 100000)
    .filter(s => s.change > 2) // Minimum 2% gain
    .filter(s => s.price > 10) // Minimum price
    .filter(s => (s.buyQty ?? 0) > (s.sellQty ?? 0)*2)
    .slice(0, 10); // Top 10 gainers
}

export function calculateConfidenceScore(stock: NSEStock): number {
  let score = 50; // Base score
  
  // Price momentum
  if (stock.change > 1) score += 10;
  if (stock.change > 2) score += 15;
  
  // Price range preference
  if (stock.price > 100 && stock.price < 1000) score += 10;
  
  return Math.min(score, 100);
}
