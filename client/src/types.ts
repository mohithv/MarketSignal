export type ScreenerResult = {
  ticker: string
  name?: string
  exchange?: string
  country?: string
  industry?: string
  marketCap?: number
  eps?: number
  dividendYield?: number
  signals?: string[]
}

export type AnalyzeResponse = {
  screenerResults: ScreenerResult[]
  claudeAnalysis: string
}

export type NSEStock = {
  symbol: string
  change: number
  price: number
  previousClose?: number
  volume?: number
  marketCap?: string
  series?: string
  buyQty?: number
  sellQty?: number
}

export type SectorRank = [string, number]

export type SectorAnalysisResponse = {
  topSector: SectorRank | undefined
  allSectors: SectorRank[]
}

export type CronJobTimeline = {
  id: string
  name: string
  expression: string
  timezone: string
  notes: string
  nextRuns: string[]
}

export type CronTimelineResponse = {
  ok: boolean
  now: string
  jobs: CronJobTimeline[]
}
