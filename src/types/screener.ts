export type ScreenerFilters = {
  marketCapMin?: number;
  marketCapMax?: number;
  epsMin?: number;
  epsMax?: number;
  industry?: string;
  signal?: string;
  limit?: number;
};

export type ScreenerResult = {
  ticker: string;
  name?: string;
  exchange?: string;
  country?: string;
  industry?: string;
  marketCap?: number;
  eps?: number;
  dividendYield?: number;
  signals?: string[];
};
