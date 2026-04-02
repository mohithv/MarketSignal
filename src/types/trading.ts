export interface NSEStock {
  symbol: string;
  change: number;
  price: number;
  previousClose?: number;
  volume?: number;
  marketCap?: string;
  series?: string;
  buyQty?: number;
  sellQty?: number;
}

export interface PreOpenResponse {
  declines: number;
  unchanged: number;
  data: PreOpenItem[];
}

export interface PreOpenItem {
  metadata: {
    symbol: string;
    identifier: string;
    series: string;
    lastPrice: number;
    change: number;
    pChange: number;
    previousClose: number;
    finalQuantity: number;
    totalTurnover: number;
    marketCap: string;
    yearHigh: number;
    yearLow: number;
    iep: number;
  };
  detail: {
    preOpenMarket: {
      preopen: Array<{
        price: number;
        buyQty: number;
        sellQty: number;
        iep?: boolean;
      }>;
      ato: {
        totalBuyQuantity: number;
        totalSellQuantity: number;
      };
      IEP: number;
      totalTradedVolume: number;
      finalPrice: number;
      finalQuantity: number;
      lastUpdateTime: string;
      totalSellQuantity: number;
      totalBuyQuantity: number;
      atoBuyQty: number;
      atoSellQty: number;
      Change: number;
      perChange: number;
      prevClose: number;
    };
  };
}

export interface BreakoutResult {
  symbol: string;
  breakout: boolean;
  price: number;
  timestamp: Date;
}

export type AlertType =
  | 'BREAKOUT'
  | 'VOLUME_SPIKE'
  | 'MOMENTUM'
  | 'WAR'
  | 'CUSTOM';

export interface TradingAlert {
  type: AlertType;
  symbol?: string;
  price?: number;
  change?: number;
  confidence?: number;
  message?: string;
  timestamp: Date;
}
