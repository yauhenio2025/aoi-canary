import { useEffect, useMemo, useState } from 'react'
import { DesignTokenProvider } from '@the-syllabus/analysis-renderers'

import artifactManifest from './fixtures/neurath-manifest.json'
import artifactPage from './fixtures/neurath-page.json'
import artifactTrace from './fixtures/neurath-trace.json'
import rendererRelease from '../vendor/renderer-release.json'
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
const RENDERER_SUMMARY = `${rendererRelease.renderer_package_version} · ${rendererRelease.renderer_tarball_sha256.slice(0, 8)}`

interface LoadState {
  page: PagePresentation | null
  manifest: ManifestLike | null
  trace: TraceLike | null
  status: Record<string, unknown> | null
  statusUnavailable?: boolean
}

const ARTIFACT_STATE: LoadState = {
  page: artifactPage as PagePresentation,
  manifest: artifactManifest as ManifestLike,
  trace: artifactTrace as TraceLike,
  status: { artifacts_ready: true, source: 'artifact' },
}

const EMPTY_LIVE_STATE: LoadState = {
  page: null,
  manifest: null,
  trace: null,
  status: null,
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
  const [liveState, setLiveState] = useState<LoadState | null>(
    DEFAULT_MODE === 'live' ? EMPTY_LIVE_STATE : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)

  useEffect(() => {
    if (mode !== 'live') return

    let cancelled = false

    const qs = `consumer_key=${encodeURIComponent(CONSUMER_KEY)}`

    fetchJson<PagePresentation>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/page/${jobId}?slim=true&${qs}`)
      .then((page) => {
        if (cancelled) return
        setLiveState((current) => ({
          ...(current ?? EMPTY_LIVE_STATE),
          page,
        }))
      })
      .catch((err) => {
        if (cancelled) return
        setLiveState(null)
        setError(toErrorMessage(err))
      })

    fetchJson<ManifestLike>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/manifest/${jobId}?${qs}`)
      .then((manifest) => {
        if (cancelled) return
        setLiveState((current) => ({
          ...(current ?? EMPTY_LIVE_STATE),
          manifest,
        }))
      })
      .catch(() => {
        if (cancelled) return
      })

    fetchJson<TraceLike>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/trace/${jobId}?${qs}`)
      .then((trace) => {
        if (cancelled) return
        setLiveState((current) => ({
          ...(current ?? EMPTY_LIVE_STATE),
          trace,
        }))
      })
      .catch(() => {
        if (cancelled) return
      })

    fetchJson<Record<string, unknown>>(`${RESOLVED_ANALYZER_V2_URL}/v1/presenter/status/${jobId}?${qs}`)
      .then((status) => {
        if (cancelled) return
        setLiveState((current) => ({
          ...(current ?? EMPTY_LIVE_STATE),
          status,
          statusUnavailable: false,
        }))
      })
      .catch(() => {
        if (cancelled) return
        setLiveState((current) => ({
          ...(current ?? EMPTY_LIVE_STATE),
          status: null,
          statusUnavailable: true,
        }))
      })

    return () => {
      cancelled = true
    }
  }, [jobId, mode])

  const loading = mode === 'live' && !(liveState?.page) && error === null
  const state = mode === 'live' ? (liveState?.page ? liveState : ARTIFACT_STATE) : ARTIFACT_STATE
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
      styleSchool: page.style_school ?? '',
      polishState: page.polish_state ?? 'raw',
    }
  }, [page])

  const liveStatusLabel = loading
    ? 'Loading live presenter page…'
    : error
      ? `Live mode error: ${error}`
      : mode === 'live' && liveState?.statusUnavailable
        ? 'Live page loaded (status unavailable)'
      : mode === 'live'
        ? 'Live page loaded'
        : 'Frozen artifact-backed mode'

  return (
    <DesignTokenProvider schoolKey={activeSummary?.styleSchool ?? ''}>
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
                setLiveState(EMPTY_LIVE_STATE)
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
                  setLiveState(EMPTY_LIVE_STATE)
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
        <div className="status-card">
          <span className="status-label">Style</span>
          <strong>{activeSummary?.styleSchool || 'fallback'}</strong>
        </div>
        <div className="status-card">
          <span className="status-label">Polish</span>
          <strong>{activeSummary?.polishState ?? 'raw'}</strong>
        </div>
        <div className="status-card status-wide">
          <span className="status-label">Renderer</span>
          <strong>{RENDERER_SUMMARY}</strong>
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
            <DebugCard title="Renderer Build" data={rendererRelease} />
            <DebugCard title="Manifest" data={manifest} />
            <DebugCard title="Trace" data={trace} />
          </div>
        ) : null}
      </section>
      </main>
    </DesignTokenProvider>
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
