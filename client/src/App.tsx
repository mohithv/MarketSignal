import { useCallback, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getSectorAnalysis, postAnalyze } from './api'
import type { AnalyzeResponse, SectorAnalysisResponse, ScreenerResult } from './types'
import { TradingDashboard } from './components/TradingDashboard'

type Tab = 'trading' | 'screener' | 'sectors'

/** Sensible starter screen — user can edit or clear any field. */
const DEFAULT_FILTERS = {
  marketCapMin: '50000000',
  marketCapMax: '',
  epsMin: '0',
  epsMax: '',
  industry: '',
  signal: '',
  limit: '25',
}

function fmtCompact(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtFixed(n: number | undefined, digits: number): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

function ResultsTable({ rows }: { rows: ScreenerResult[] }) {
  if (rows.length === 0) {
    return <p className="muted">No rows returned for this screen.</p>
  }
  console.log("Api Data : ", rows);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Mkt cap</th>
            <th>EPS</th>
            <th>Div %</th>
            <th>Industry</th>
            <th>Signals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              <td className="mono">{r.ticker}</td>
              <td>{(r.name ?? '—').slice(0, 40)}</td>
              <td className="num">{fmtCompact(r.marketCap)}</td>
              <td className="num">{fmtFixed(r.eps, 2)}</td>
              <td className="num">
                {r.dividendYield !== undefined && Number.isFinite(r.dividendYield)
                  ? `${fmtFixed(r.dividendYield, 2)}%`
                  : '—'}
              </td>
              <td>{(r.industry ?? '—').slice(0, 28)}</td>
              <td className="signals">
                {r.signals?.slice(0, 4).join(', ') ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectorView({ data }: { data: SectorAnalysisResponse }) {
  const max = useMemo(() => {
    const scores = data.allSectors.map(([, s]) => Math.abs(s))
    const m = Math.max(1, ...scores)
    return m
  }, [data.allSectors])

  return (
    <div className="sector-grid">
      <div className="card highlight">
        <h3>Top sector</h3>
        {data.topSector ? (
          <p className="top-sector">
            <span className="name">{data.topSector[0]}</span>
            <span className="score mono">{data.topSector[1].toFixed(3)}</span>
          </p>
        ) : (
          <p className="muted">No sector scores yet.</p>
        )}
      </div>
      <div className="card">
        <h3>All sectors</h3>
        <ul className="sector-bars">
          {data.allSectors.map(([name, score]) => (
            <li key={name}>
              <div className="bar-row">
                <span className="label">{name}</span>
                <span className="mono score-sm">{score.toFixed(3)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(Math.abs(score) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('trading')

  const [marketCapMin, setMarketCapMin] = useState(DEFAULT_FILTERS.marketCapMin)
  const [marketCapMax, setMarketCapMax] = useState(DEFAULT_FILTERS.marketCapMax)
  const [epsMin, setEpsMin] = useState(DEFAULT_FILTERS.epsMin)
  const [epsMax, setEpsMax] = useState(DEFAULT_FILTERS.epsMax)
  const [industry, setIndustry] = useState(DEFAULT_FILTERS.industry)
  const [signal, setSignal] = useState(DEFAULT_FILTERS.signal)
  const [limit, setLimit] = useState(DEFAULT_FILTERS.limit)

  const [riskTolerance, setRiskTolerance] = useState<
    '' | 'low' | 'medium' | 'high'
  >('medium')
  const [focus, setFocus] = useState<
    '' | 'value' | 'growth' | 'dividends' | 'momentum'
  >('value')
  const [timeHorizon, setTimeHorizon] = useState<
    '' | 'short' | 'medium' | 'long'
  >('medium')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(
    null,
  )

  const [sectorLoading, setSectorLoading] = useState(false)
  const [sectorError, setSectorError] = useState<string | null>(null)
  const [sectorData, setSectorData] = useState<SectorAnalysisResponse | null>(
    null,
  )

  const parseNum = (s: string): number | undefined => {
    const t = s.trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }

  const runAnalyze = useCallback(async () => {
    setError(null)
    setLoading(true)
    setAnalyzeResult(null)
    try {
      const filters: Record<string, unknown> = {}
      const mcMin = parseNum(marketCapMin)
      const mcMax = parseNum(marketCapMax)
      const eMin = parseNum(epsMin)
      const eMax = parseNum(epsMax)
      const lim = parseNum(limit)
      if (mcMin !== undefined) filters.marketCapMin = mcMin
      if (mcMax !== undefined) filters.marketCapMax = mcMax
      if (eMin !== undefined) filters.epsMin = eMin
      if (eMax !== undefined) filters.epsMax = eMax
      if (industry.trim()) filters.industry = industry.trim()
      if (signal.trim()) filters.signal = signal.trim()
      if (lim !== undefined) filters.limit = lim

      const analysisPreferences: Record<string, unknown> = {}
      if (riskTolerance) analysisPreferences.riskTolerance = riskTolerance
      if (focus) analysisPreferences.focus = focus
      if (timeHorizon) analysisPreferences.timeHorizon = timeHorizon

      const body: Record<string, unknown> = {}
      if (Object.keys(filters).length > 0) body.filters = filters
      if (Object.keys(analysisPreferences).length > 0) {
        body.analysisPreferences = analysisPreferences
      }

      const out = await postAnalyze(body)
      setAnalyzeResult(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [
    marketCapMin,
    marketCapMax,
    epsMin,
    epsMax,
    industry,
    signal,
    limit,
    riskTolerance,
    focus,
    timeHorizon,
  ])

  const runSectors = useCallback(async () => {
    setSectorError(null)
    setSectorLoading(true)
    try {
      const out = await getSectorAnalysis()
      setSectorData(out)
    } catch (e) {
      setSectorError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSectorLoading(false)
    }
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">◈</span>
          <div>
            <h1>PredPrices</h1>
            <p className="tagline">Screen equities and read AI commentary</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Primary">
          <button
            type="button"
            className={tab === 'trading' ? 'tab active' : 'tab'}
            onClick={() => setTab('trading')}
          >
            Live trading
          </button>
          <button
            type="button"
            className={tab === 'screener' ? 'tab active' : 'tab'}
            onClick={() => setTab('screener')}
          >
            Screener
          </button>
          <button
            type="button"
            className={tab === 'sectors' ? 'tab active' : 'tab'}
            onClick={() => setTab('sectors')}
          >
            Sector sentiment
          </button>
        </nav>
      </header>

      {tab === 'trading' && (
        <main className="main">
          <TradingDashboard apiKey={import.meta.env.VITE_API_KEY ?? ''} />
        </main>
      )}

      {tab === 'screener' && (
        <main className="main">
          <section className="grid-2">
            <div className="card">
              <h2>Filters</h2>
              <p className="muted small">
                Starter values are pre-filled; edit or clear any field before running.
              </p>
              <div className="field-grid">
                <label>
                  Market cap min
                  <input
                    inputMode="decimal"
                    placeholder="e.g. 100000000"
                    value={marketCapMin}
                    onChange={(e) => setMarketCapMin(e.target.value)}
                  />
                </label>
                <label>
                  Market cap max
                  <input
                    inputMode="decimal"
                    placeholder="optional"
                    value={marketCapMax}
                    onChange={(e) => setMarketCapMax(e.target.value)}
                  />
                </label>
                <label>
                  EPS min
                  <input
                    inputMode="decimal"
                    value={epsMin}
                    onChange={(e) => setEpsMin(e.target.value)}
                  />
                </label>
                <label>
                  EPS max
                  <input
                    inputMode="decimal"
                    value={epsMax}
                    onChange={(e) => setEpsMax(e.target.value)}
                  />
                </label>
                <label className="span-2">
                  Industry
                  <input
                    placeholder="e.g. Software"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </label>
                <label className="span-2">
                  Signal
                  <input
                    placeholder="optional"
                    value={signal}
                    onChange={(e) => setSignal(e.target.value)}
                  />
                </label>
                <label>
                  Row limit
                  <input
                    inputMode="numeric"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <h2>Analysis preferences</h2>
              <p className="muted small">
                Shapes the narrative from the LLM; all optional.
              </p>
              <div className="field-grid prefs">
                <label>
                  Risk
                  <select
                    value={riskTolerance}
                    onChange={(e) =>
                      setRiskTolerance(
                        e.target.value as '' | 'low' | 'medium' | 'high',
                      )
                    }
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  Focus
                  <select
                    value={focus}
                    onChange={(e) =>
                      setFocus(
                        e.target.value as
                          | ''
                          | 'value'
                          | 'growth'
                          | 'dividends'
                          | 'momentum',
                      )
                    }
                  >
                    <option value="">—</option>
                    <option value="value">Value</option>
                    <option value="growth">Growth</option>
                    <option value="dividends">Dividends</option>
                    <option value="momentum">Momentum</option>
                  </select>
                </label>
                <label className="span-2">
                  Time horizon
                  <select
                    value={timeHorizon}
                    onChange={(e) =>
                      setTimeHorizon(
                        e.target.value as '' | 'short' | 'medium' | 'long',
                      )
                    }
                  >
                    <option value="">—</option>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={loading}
              onClick={() => void runAnalyze()}
            >
              {loading ? 'Running…' : 'Run screen & analyze'}
            </button>
          </div>

          {error && <div className="banner error">{error}</div>}

          {analyzeResult && (
            <>
              <section className="card block">
                <h2>Screener results</h2>
                <ResultsTable rows={analyzeResult.screenerResults} />
              </section>
              <section className="card block analysis-card">
                <h2>AI analysis</h2>
                <article className="markdown-body">
                  <ReactMarkdown>{analyzeResult.claudeAnalysis}</ReactMarkdown>
                </article>
              </section>
            </>
          )}
        </main>
      )}

      {tab === 'sectors' && (
        <main className="main">
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={sectorLoading}
              onClick={() => void runSectors()}
            >
              {sectorLoading ? 'Loading…' : 'Load sector sentiment'}
            </button>
          </div>
          {sectorError && (
            <div className="banner error">{sectorError}</div>
          )}
          {sectorData && <SectorView data={sectorData} />}
          {!sectorData && !sectorLoading && !sectorError && (
            <p className="muted center">
              Fetches news, scores sentiment, and ranks sectors (Defence, Energy,
              Banking, IT, Other).
            </p>
          )}
        </main>
      )}

      <footer className="footer">
        <p>
          Informational only — not investment advice. Backend:{' '}
          <code className="mono">POST /analyze</code>,{' '}
          <code className="mono">GET /sector-analysis</code>
        </p>
      </footer>
    </div>
  )
}
