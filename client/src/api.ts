import type { AnalyzeResponse, SectorAnalysisResponse } from './types'
import type { CronTimelineResponse } from './types'

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function authHeaders(): HeadersInit {
  const h = new Headers()
  const key = import.meta.env.VITE_API_KEY
  if (key && key.length > 0) {
    h.set('x-api-key', key)
  }
  return h
}

function jsonHeaders(): HeadersInit {
  const h = new Headers(authHeaders())
  h.set('Content-Type', 'application/json')
  return h
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    return body.error ?? body.message ?? `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function postAnalyze(body: unknown): Promise<AnalyzeResponse> {
  const url = `${base}/analyze`
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<AnalyzeResponse>
}

export async function getSectorAnalysis(): Promise<SectorAnalysisResponse> {
  const url = `${base}/sector-analysis`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SectorAnalysisResponse>
}

export async function getCronTimeline(): Promise<CronTimelineResponse> {
  const url = `${base}/api/cron-timeline`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<CronTimelineResponse>
}
