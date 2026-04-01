import { describe, expect, it } from 'vitest';
import { runScreenAndAnalyze } from '../src/services/analysisService.js';
import type { ScreenerResult } from '../src/types/screener.js';

describe('runScreenAndAnalyze', () => {
  it('returns screener results and claude analysis (mocked)', async () => {
    const mockResults: ScreenerResult[] = [
      { ticker: 'ABC', name: 'ABC Corp', marketCap: 1000000000, eps: 2.5, dividendYield: 1.2, signals: ['new_200d_highs'] },
      { ticker: 'XYZ', name: 'XYZ Inc', marketCap: 500000000, eps: 1.1, dividendYield: 0.0, signals: [] },
    ];

    const out = await runScreenAndAnalyze(
      { marketCapMin: 100_000_000, limit: 10, signal: 'new_200d_highs' },
      { focus: 'momentum', riskTolerance: 'medium', timeHorizon: 'short' },
      {
        runScreenerImpl: async () => mockResults,
        analyzeWithClaudeImpl: async () => 'mock-claude-analysis',
      }
    );

    expect(out.screenerResults.length).toBe(2);
    expect(out.claudeAnalysis).toBe('mock-claude-analysis');
  });
});
