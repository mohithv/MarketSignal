import type { AnalysisPreferences } from '../types/analysis.js';
import type { ScreenerFilters, ScreenerResult } from '../types/screener.js';

type Deps = {
  runScreenerImpl: (filters: ScreenerFilters) => Promise<ScreenerResult[]>;
  analyzeWithClaudeImpl: (prompt: string) => Promise<string>;
};

async function defaultRunScreener(filters: ScreenerFilters): Promise<ScreenerResult[]> {
  const mod = await import('../clients/screenerClient.js');
  return mod.runScreener(filters);
}

async function defaultAnalyzeWithClaude(prompt: string): Promise<string> {
  const mod = await import('../clients/groqClient.js');
  return mod.analyzeWithGroq(prompt);
}

const defaultDeps: Deps = {
  runScreenerImpl: defaultRunScreener,
  analyzeWithClaudeImpl: defaultAnalyzeWithClaude,
};

function fmtNum(n: number | undefined, opts?: Intl.NumberFormatOptions): string {
  if (n === undefined || !Number.isFinite(n)) return '-';
  return new Intl.NumberFormat('en-US', opts).format(n);
}

function summarizeResults(results: ScreenerResult[], maxRows: number): string {
  const rows = results.slice(0, maxRows);

  const header = ['TICKER', 'NAME', 'MKT_CAP', 'EPS', 'DIV_YIELD', 'INDUSTRY', 'SIGNALS'].join(' | ');
  const sep = '--- | --- | --- | --- | --- | --- | ---';

  const lines = rows.map((r) => {
    const div = r.dividendYield !== undefined ? `${fmtNum(r.dividendYield, { maximumFractionDigits: 2 })}%` : '-';
    const signals = r.signals?.slice(0, 3).join(', ') ?? '-';

    return [
      r.ticker,
      (r.name ?? '-').slice(0, 32),
      fmtNum(r.marketCap, { notation: 'compact', maximumFractionDigits: 2 }),
      fmtNum(r.eps, { maximumFractionDigits: 2 }),
      div,
      (r.industry ?? '-').slice(0, 24),
      signals,
    ].join(' | ');
  });

  return [header, sep, ...lines].join('\n');
}

function buildPrompt(args: {
  filters: ScreenerFilters;
  preferences?: AnalysisPreferences;
  results: ScreenerResult[];
  includedRows: number;
}): string {
  const { filters, preferences, results, includedRows } = args;

  const filtersSummary = {
    marketCapMin: filters.marketCapMin,
    marketCapMax: filters.marketCapMax,
    epsMin: filters.epsMin,
    epsMax: filters.epsMax,
    industry: filters.industry,
    signal: filters.signal,
    limit: filters.limit,
  };

  const preferencesSummary = preferences ?? {};

  const table = summarizeResults(results, includedRows);

  return [
    'Screening strategy and filters:',
    JSON.stringify(filtersSummary, null, 2),
    '',
    'Analysis preferences:',
    JSON.stringify(preferencesSummary, null, 2),
    '',
    `Screened results (top ${Math.min(includedRows, results.length)} rows):`,
    table,
    '',
    'Tasks:',
    '1) Identify 3-5 interesting candidates given the preferences (value/growth/dividends/momentum) and the signal.',
    '2) Explain why they stand out using only the data shown (be explicit about uncertainty).',
    '3) Call out obvious red flags (e.g., negative/low EPS, missing data, very small market cap, etc.).',
    '4) End with a clear disclaimer that this is informational only and not investment advice.',
  ].join('\n');
}

export async function runScreenAndAnalyze(
  filters: ScreenerFilters,
  preferences?: AnalysisPreferences,
  deps: Partial<Deps> = {}
): Promise<{ screenerResults: ScreenerResult[]; claudeAnalysis: string }> {
  const { runScreenerImpl, analyzeWithClaudeImpl } = { ...defaultDeps, ...deps };

  const raw = await runScreenerImpl(filters);

  const limited = raw.slice(0, Math.min(filters.limit ?? 50, 50));

  const prompt = buildPrompt({
    filters,
    preferences,
    results: limited,
    includedRows: Math.min(limited.length, 30),
  });

  const claudeAnalysis = await analyzeWithClaudeImpl(prompt);

  return {
    screenerResults: limited,
    claudeAnalysis,
  };
}
