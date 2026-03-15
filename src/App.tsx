import { useEffect, useMemo, useState } from 'react'

import artifactManifest from './fixtures/neurath-manifest.json'
import artifactPage from './fixtures/neurath-page.json'
import artifactTrace from './fixtures/neurath-trace.json'
import './App.css'
import { RendererHost } from './components/RendererHost'
import { TabShell } from './components/TabShell'
import type { ManifestLike, PagePresentation, TraceLike } from './types/presentation'

type Mode = 'artifact' | 'live'

const ANALYZER_V2_URL = import.meta.env.VITE_ANALYZER_V2_URL?.trim() ?? ''
const RESOLVED_ANALYZER_V2_URL =
  ANALYZER_V2_URL || (typeof window !== 'undefined' ? window.location.origin : '')
const DEFAULT_MODE: Mode = import.meta.env.VITE_AOI_MODE === 'live' ? 'live' : 'artifact'
const DEFAULT_JOB_ID = import.meta.env.VITE_AOI_JOB_ID?.trim() || artifactPage.job_id
const CONSUMER_KEY = 'aoi-canary'

interface LoadState {
  page: PagePresentation
  manifest: ManifestLike
  trace: TraceLike
  status: Record<string, unknown> | null
  statusUnavailable?: boolean
}

const ARTIFACT_STATE: LoadState = {
  page: artifactPage as PagePresentation,
  manifest: artifactManifest as ManifestLike,
  trace: artifactTrace as TraceLike,
  status: { artifacts_ready: true, source: 'artifact' },
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json() as Promise<T>
}

export default function App() {
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE)
  const [jobId, setJobId] = useState(DEFAULT_JOB_ID)
  const [liveState, setLiveState] = useState<LoadState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)

  useEffect(() => {
    if (mode !== 'live') return

    let cancelled = false

    const qs = `consumer_key=${encodeURIComponent(CONSUMER_KEY)}`
    Promise.all([
      fetchJson<PagePresentation>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/page/${jobId}?slim=true&${qs}`),
      fetchJson<ManifestLike>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/manifest/${jobId}?${qs}`),
      fetchJson<TraceLike>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/trace/${jobId}?${qs}`),
      fetchJson<Record<string, unknown>>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/status/${jobId}?${qs}`)
        .then((status) => ({ status, statusUnavailable: false }))
        .catch(() => ({ status: null, statusUnavailable: true })),
    ])
      .then(([page, manifest, trace, statusState]) => {
        if (cancelled) return
        setLiveState({
          page,
          manifest,
          trace,
          status: statusState.status,
          statusUnavailable: statusState.statusUnavailable,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setLiveState(null)
        setError(toErrorMessage(err))
      })

    return () => {
      cancelled = true
    }
  }, [jobId, mode])

  const loading = mode === 'live' && liveState === null && error === null
  const state = mode === 'live' ? liveState : ARTIFACT_STATE
  const page = state?.page ?? null
  const manifest = state?.manifest ?? null
  const trace = state?.trace ?? null
  const rootView = page?.views?.[0] ?? null
  const canUseLiveMode = Boolean(RESOLVED_ANALYZER_V2_URL)

  const activeSummary = useMemo(() => {
    if (!page) return null
    return {
      thinkerName: page.thinker_name,
      strategySummary: page.strategy_summary,
      jobId: page.job_id,
      planId: page.plan_id,
      consumerKey: CONSUMER_KEY,
      viewCount: page.view_count,
    }
  }, [page])

  const liveStatusLabel = loading
    ? 'Loading live presenter artifacts…'
    : error
      ? `Live mode error: ${error}`
      : mode === 'live' && liveState?.statusUnavailable
        ? 'Live presenter artifacts loaded (status unavailable)'
      : mode === 'live'
        ? 'Live presenter artifacts loaded'
        : 'Frozen artifact-backed mode'

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AOI Thin Consumer Canary</p>
          <h1>Benanav vs Otto Neurath</h1>
          <p className="lede">
            Separate app canary over analyzer-v2 AOI output. This app hosts a generic tab shell and shared
            renderers only.
          </p>
        </div>

        <div className="mode-controls">
          <div className="mode-toggle" role="group" aria-label="Mode switcher">
            <button
              type="button"
              className={mode === 'artifact' ? 'active' : ''}
              onClick={() => {
                setMode('artifact')
                setLiveState(null)
                setError(null)
              }}
            >
              Artifact
            </button>
            <button
              type="button"
              className={mode === 'live' ? 'active' : ''}
              onClick={() => {
                setMode('live')
                setLiveState(null)
                setError(null)
              }}
              disabled={!canUseLiveMode}
            >
              Live
            </button>
          </div>

          <label className="job-input">
            <span>Job ID</span>
            <input
              value={jobId}
              onChange={(event) => {
                setJobId(event.target.value)
                if (mode === 'live') {
                  setLiveState(null)
                  setError(null)
                }
              }}
              disabled={mode !== 'live'}
            />
          </label>
        </div>
      </header>

      <section className="status-row">
        <div className="status-card">
          <span className="status-label">Mode</span>
          <strong>{mode}</strong>
        </div>
        <div className="status-card">
          <span className="status-label">Consumer</span>
          <strong>{CONSUMER_KEY}</strong>
        </div>
        <div className="status-card status-wide">
          <span className="status-label">State</span>
          <strong>{liveStatusLabel}</strong>
        </div>
      </section>

      {activeSummary ? (
        <section className="meta-grid">
          <article className="meta-card">
            <span>Thinker</span>
            <strong>{activeSummary.thinkerName}</strong>
          </article>
          <article className="meta-card">
            <span>Job</span>
            <strong>{activeSummary.jobId}</strong>
          </article>
          <article className="meta-card">
            <span>Plan</span>
            <strong>{activeSummary.planId}</strong>
          </article>
          <article className="meta-card">
            <span>Views</span>
            <strong>{activeSummary.viewCount}</strong>
          </article>
        </section>
      ) : null}

      <section className="strategy-card">
        <span className="status-label">Strategy Summary</span>
        <p>{activeSummary?.strategySummary ?? 'Waiting for presenter data.'}</p>
      </section>

      <section className="canary-surface">
        {!rootView ? (
          <div className="empty-state">
            <h2>No AOI page available</h2>
            <p>{error ?? 'No page payload is loaded yet.'}</p>
          </div>
        ) : rootView.renderer_type !== 'tab' ? (
          <div className="empty-state">
            <h2>Unexpected root renderer</h2>
            <p>
              The AOI canary expects a top-level <code>tab</code> view but received{' '}
              <code>{rootView.renderer_type}</code>.
            </p>
          </div>
        ) : (
          <TabShell
            view={rootView}
            renderView={(view) => <RendererHost key={view.view_key} view={view} />}
          />
        )}
      </section>

      <section className="debug-panel">
        <button type="button" className="debug-toggle" onClick={() => setDebugOpen((open) => !open)}>
          {debugOpen ? 'Hide' : 'Show'} Debug Payloads
        </button>
        {debugOpen ? (
          <div className="debug-grid">
            <DebugCard title="Manifest" data={manifest} />
            <DebugCard title="Trace" data={trace} />
          </div>
        ) : null}
      </section>
    </main>
  )
}

function DebugCard({ title, data }: { title: string; data: unknown }) {
  return (
    <article className="debug-card">
      <h2>{title}</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </article>
  )
}
