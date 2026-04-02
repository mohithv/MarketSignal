// src/services/sectorImpact.ts

export type SimpleStock = {
  name: string;
  symbol: string;
};

export const WAR_IMPACT = {
  positive: [
    { name: "ONGC", symbol: "ONGC.NS" },
    { name: "OIL", symbol: "OIL.NS" },
    { name: "BEL", symbol: "BEL.NS" },
    { name: "HAL", symbol: "HAL.NS" },
    { name: "ADANIPOWER", symbol: "ADANIPOWER.NS" },
  ],
  negative: [
    { name: "INFY", symbol: "INFY.NS" },
    { name: "TCS", symbol: "TCS.NS" },
    { name: "HDFCBANK", symbol: "HDFCBANK.NS" },
    { name: "MARUTI", symbol: "MARUTI.NS" },
  ],
};