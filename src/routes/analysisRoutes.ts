import { Router } from 'express';
import type { AnalysisPreferences } from '../types/analysis.js';
import type { ScreenerFilters } from '../types/screener.js';
import { runScreenAndAnalyze } from '../services/analysisService.js';
import { analysisSchema } from '../validators/analysisValidator.js';
function asNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function asString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') return undefined;
  const s = val.trim();
  return s.length > 0 ? s : undefined;
}

function sanitizeFilters(input: unknown): ScreenerFilters {
  const obj = (input ?? {}) as Record<string, unknown>;

  const limit = asNumber(obj.limit);

  return {
    marketCapMin: asNumber(obj.marketCapMin),
    marketCapMax: asNumber(obj.marketCapMax),
    epsMin: asNumber(obj.epsMin),
    epsMax: asNumber(obj.epsMax),
    industry: asString(obj.industry),
    signal: asString(obj.signal),
    limit: limit !== undefined ? Math.max(1, Math.min(200, Math.floor(limit))) : undefined,
  };
}

function sanitizePreferences(input: unknown): AnalysisPreferences | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;

  const riskTolerance = asString(obj.riskTolerance);
  const focus = asString(obj.focus);
  const timeHorizon = asString(obj.timeHorizon);

  const prefs: AnalysisPreferences = {
    riskTolerance: riskTolerance as AnalysisPreferences['riskTolerance'],
    focus: focus as AnalysisPreferences['focus'],
    timeHorizon: timeHorizon as AnalysisPreferences['timeHorizon'],
  };

  if (!prefs.riskTolerance && !prefs.focus && !prefs.timeHorizon) return undefined;
  return prefs;
}

export const analysisRouter = Router();

analysisRouter.get('/analyze', (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Use POST /analyze with JSON body { filters?, analysisPreferences? }',
  });
});

analysisRouter.post('/analyze', async (req, res, next) => {
  try {
    const parsed = analysisSchema.parse(req.body);

    const result = await runScreenAndAnalyze(
      sanitizeFilters(parsed.filters),
      sanitizePreferences(parsed.analysisPreferences)
    );

    return res.status(200).json(result);
  } catch (err) {
    next(err); // 🔥 pass to global handler
  }
});
