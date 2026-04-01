import { useMemo, useState, useEffect, useCallback } from 'react'
import type { NSEStock } from '../types'

interface TradingDashboardProps {
  apiKey: string
}

export function TradingDashboard({ apiKey }: TradingDashboardProps) {
  const [preOpenData, setPreOpenData] = useState<any>(null)
  const [topGainers, setTopGainers] = useState<NSEStock[]>([])
  const [candidates, setCandidates] = useState<NSEStock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<
    Array<{ ts: number; topGainers: NSEStock[]; candidates: NSEStock[] }>
  >([])

  const preOpenRows = useMemo(() => {
    const rows = (preOpenData?.data ?? []) as Array<{
      metadata?: {
        symbol?: string
        lastPrice?: number
        pChange?: number
        previousClose?: number
        finalQuantity?: number
        series?: string
      }
    }>

    return rows
      .map((r) => {
        const md = r.metadata
        const symbol = md?.symbol
        const pChange = md?.pChange
        const lastPrice = md?.lastPrice
        if (!symbol || !Number.isFinite(pChange) || !Number.isFinite(lastPrice)) return null

        return {
          symbol,
          price: lastPrice as number,
          change: pChange as number,
          previousClose: md?.previousClose,
          volume: md?.finalQuantity,
          series: md?.series,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.change - a.change)
      .slice(0, 50)
  }, [preOpenData])

  const baseUrl = useMemo(
    () =>
      (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') ||
      window.location.origin,
    [],
  )

  const headers = useMemo(() => {
    if (apiKey && apiKey.length > 0) return { 'x-api-key': apiKey }
    return undefined
  }, [apiKey])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [preOpenRes, gainersRes, candidatesRes] = await Promise.all([
        fetch(`${baseUrl}/api/trading/pre-open`, { headers }),
        fetch(`${baseUrl}/api/trading/top-gainers`, { headers }),
        fetch(`${baseUrl}/api/trading/candidates`, { headers }),
      ])

      const parseErr = async (res: Response) => {
        try {
          const body = (await res.json()) as { error?: string; message?: string }
          return body.error ?? body.message ?? `Request failed (${res.status})`
        } catch {
          return `Request failed (${res.status})`
        }
      }

      const [preOpen, gainers, candidatesData] = await Promise.all([
        preOpenRes.ok ? preOpenRes.json() : Promise.resolve(null),
        gainersRes.ok ? gainersRes.json() : Promise.resolve(null),
        candidatesRes.ok ? candidatesRes.json() : Promise.resolve(null),
      ])

      if (!preOpenRes.ok) throw new Error(await parseErr(preOpenRes))
      if (!gainersRes.ok) throw new Error(await parseErr(gainersRes))
      if (!candidatesRes.ok) throw new Error(await parseErr(candidatesRes))

      setPreOpenData(preOpen)
      const nextTop = Array.isArray(gainers) ? (gainers as NSEStock[]) : []
      const nextCandidates = Array.isArray(candidatesData)
        ? (candidatesData as NSEStock[])
        : []

      setTopGainers(nextTop)
      setCandidates(nextCandidates)

      setHistory((prev) => {
        const next = [{ ts: Date.now(), topGainers: nextTop, candidates: nextCandidates }, ...prev]
          .slice(0, 50)
        try {
          localStorage.setItem('trading_history_v1', JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    } catch (error) {
      console.error('Error fetching trading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch trading data')
      setTopGainers([])
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [baseUrl, headers])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('trading_history_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          ts: number
          topGainers: NSEStock[]
          candidates: NSEStock[]
        }>
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 50))
      }
    } catch {
      // ignore
    }
    fetchData()
    // Refresh every 2 minutes during market hours
    const interval = setInterval(fetchData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const { buyNow, sellNow } = useMemo(() => {
    const pool = [...candidates, ...topGainers]

    const bestBySymbol = new Map<string, NSEStock>()
    for (const s of pool) {
      const prev = bestBySymbol.get(s.symbol)
      if (!prev) {
        bestBySymbol.set(s.symbol, s)
        continue
      }

      const prevScore = Math.abs((prev.buyQty ?? 0) - (prev.sellQty ?? 0))
      const score = Math.abs((s.buyQty ?? 0) - (s.sellQty ?? 0))
      if (score > prevScore) bestBySymbol.set(s.symbol, s)
    }

    const uniq = [...bestBySymbol.values()]
    const buy = uniq
      .filter((s) => (s.buyQty ?? 0) > (s.sellQty ?? 0))
      .sort(
        (a, b) =>
          (b.buyQty ?? 0) - (b.sellQty ?? 0) -
          ((a.buyQty ?? 0) - (a.sellQty ?? 0)),
      )
      .slice(0, 15)

    const sell = uniq
      .filter((s) => (s.sellQty ?? 0) > (s.buyQty ?? 0))
      .sort(
        (a, b) =>
          (b.sellQty ?? 0) - (b.buyQty ?? 0) -
          ((a.sellQty ?? 0) - (a.buyQty ?? 0)),
      )
      .slice(0, 15)

    return { buyNow: buy, sellNow: sell }
  }, [candidates, topGainers])

  if (loading && !preOpenData) {
    return <div className="loading">Loading trading data...</div>
  }

  return (
    <div className="trading-dashboard">
      {error ? <div className="muted">{error}</div> : null}
      <div className="dashboard-header">
        <h2>📈 Live Trading Dashboard</h2>
        <button onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="section">
        <h3>🟢 Buy now (demand &gt; supply)</h3>
        {buyNow.length === 0 ? (
          <p className="muted">No strong buy signals right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Buy Qty</th>
                  <th>Sell Qty</th>
                  <th>Imbalance</th>
                </tr>
              </thead>
              <tbody>
                {buyNow.map((s) => (
                  <tr key={s.symbol}>
                    <td className="symbol">{s.symbol}</td>
                    <td>₹{s.price?.toFixed(2)}</td>
                    <td>{fmtCompact(s.buyQty)}</td>
                    <td>{fmtCompact(s.sellQty)}</td>
                    <td className="green">
                      {fmtCompact((s.buyQty ?? 0) - (s.sellQty ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <h3>🔴 Sell now (supply &gt; demand)</h3>
        {sellNow.length === 0 ? (
          <p className="muted">No strong sell signals right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Sell Qty</th>
                  <th>Buy Qty</th>
                  <th>Imbalance</th>
                </tr>
              </thead>
              <tbody>
                {sellNow.map((s) => (
                  <tr key={s.symbol}>
                    <td className="symbol">{s.symbol}</td>
                    <td>₹{s.price?.toFixed(2)}</td>
                    <td>{fmtCompact(s.sellQty)}</td>
                    <td>{fmtCompact(s.buyQty)}</td>
                    <td className="red">
                      {fmtCompact((s.sellQty ?? 0) - (s.buyQty ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Market Overview */}
      {preOpenData && (
        <div className="market-overview">
          <h3>Market Overview (Pre-Open)</h3>
          <div className="market-stats">
            <div className="stat">
              <span className="label">Declines:</span>
              <span className="value red">{preOpenData.declines}</span>
            </div>
            <div className="stat">
              <span className="label">Unchanged:</span>
              <span className="value yellow">{preOpenData.unchanged}</span>
            </div>
            <div className="stat">
              <span className="label">Data Points:</span>
              <span className="value green">{preOpenData.data?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <h3>🗓️ Today Pre-Open (Top movers)</h3>
        {!preOpenData ? (
          <p className="muted">Pre-open data not loaded yet.</p>
        ) : preOpenRows.length === 0 ? (
          <p className="muted">No pre-open rows available.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change %</th>
                  <th>Volume</th>
                  <th>Series</th>
                </tr>
              </thead>
              <tbody>
                {preOpenRows.map((r) => (
                  <tr key={r.symbol}>
                    <td className="symbol">{r.symbol}</td>
                    <td>₹{r.price.toFixed(2)}</td>
                    <td className={r.change > 0 ? 'green' : 'red'}>
                      {r.change > 0 ? '+' : ''}
                      {r.change.toFixed(2)}%
                    </td>
                    <td>{fmtCompact(r.volume)}</td>
                    <td>{r.series}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Gainers */}
      <div className="section">
        <h3>🚀 Top Gainers</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change %</th>
                <th>Volume</th>
                <th>Buy Qty</th>
                <th>Sell Qty</th>
                <th>Series</th>
              </tr>
            </thead>
            <tbody>
              {topGainers.slice(0, 10).map((stock) => (
                <tr key={stock.symbol}>
                  <td className="symbol">{stock.symbol}</td>
                  <td>₹{stock.price?.toFixed(2)}</td>
                  <td className={stock.change && stock.change > 0 ? 'green' : 'red'}>
                    {stock.change ? `+${stock.change.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td>{fmtCompact(stock.volume)}</td>
                  <td>{fmtCompact(stock.buyQty)}</td>
                  <td>{fmtCompact(stock.sellQty)}</td>
                  <td>{stock.series}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtered Candidates */}
      <div className="section">
        <h3>🎯 Breakout Candidates</h3>
        <div className="candidates-grid">
          {candidates.map((stock) => (
            <div key={stock.symbol} className="candidate-card">
              <div className="card-header">
                <span className="symbol">{stock.symbol}</span>
                <span className={`change ${stock.change && stock.change > 0 ? 'green' : 'red'}`}>
                  {stock.change ? `+${stock.change.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
              <div className="card-body">
                <div className="price">₹{stock.price?.toFixed(2)}</div>
                <div className="volume">Vol: {fmtCompact(stock.volume)}</div>
                <div className="buy-sell">
                  Buy: {fmtCompact(stock.buyQty)} | Sell: {fmtCompact(stock.sellQty)}
                </div>
              </div>
              <div className="card-footer">
                <span className="series">{stock.series}</span>
                <span className="market-cap">{stock.marketCap}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>🕒 History</h3>
        {history.length === 0 ? (
          <p className="muted">No history yet. It will appear after the first successful refresh.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Candidates</th>
                  <th>Top gainers</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.ts}>
                    <td>{new Date(h.ts).toLocaleString()}</td>
                    <td>{h.candidates.length}</td>
                    <td>{h.topGainers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .trading-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .dashboard-header h2 {
          margin: 0;
          color: #333;
        }

        .dashboard-header button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .dashboard-header button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .market-overview {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .market-stats {
          display: flex;
          gap: 30px;
          margin-top: 10px;
        }

        .stat {
          display: flex;
          gap: 10px;
        }

        .label {
          font-weight: 600;
        }

        .value.red { color: #dc3545; }
        .value.green { color: #28a745; }
        .value.yellow { color: #ffc107; }

        .section {
          margin-bottom: 30px;
        }

        .section h3 {
          margin-bottom: 15px;
          color: #333;
        }

        .candidates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        }

        .candidate-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .symbol {
          font-weight: 600;
          font-size: 16px;
        }

        .change.green {
          color: #28a745;
          font-weight: 600;
        }

        .change.red {
          color: #dc3545;
          font-weight: 600;
        }

        .card-body {
          margin-bottom: 10px;
        }

        .price {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .volume, .buy-sell {
          font-size: 12px;
          color: #666;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #888;
        }

        .green { color: #28a745; }
        .red { color: #dc3545; }

        @media (max-width: 768px) {
          .market-stats {
            flex-direction: column;
            gap: 10px;
          }
          
          .candidates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function fmtCompact(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
}
