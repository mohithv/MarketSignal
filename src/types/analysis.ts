export type RiskTolerance = 'low' | 'medium' | 'high';
export type AnalysisFocus = 'value' | 'growth' | 'dividends' | 'momentum';
export type TimeHorizon = 'short' | 'medium' | 'long';

export type AnalysisPreferences = {
  riskTolerance?: RiskTolerance;
  focus?: AnalysisFocus;
  timeHorizon?: TimeHorizon;
};
