import { useEffect, useMemo, useReducer, useState } from 'react'
import { DesignTokenProvider } from '@the-syllabus/analysis-renderers'

import artifactManifest from './fixtures/neurath-manifest.json'
import artifactPage from './fixtures/neurath-page.json'
import artifactTrace from './fixtures/neurath-trace.json'
import transientProofFixture from './fixtures/transient-aoi-source-selection.json'
import transientSourceProfileFixture from './fixtures/transient-aoi-source-profile-dossier.json'
import transientSourceProfileComparisonFixture from './fixtures/transient-aoi-source-profile-comparison.json'
import transientGenealogyDirectSectionsFixture from './fixtures/transient-genealogy-direct-sections.json'
import rendererRelease from '../vendor/renderer-release.json'
import './App.css'
import { RendererHost } from './components/RendererHost'
import { TabShell } from './components/TabShell'
import {
  collectRawJsonLeafKeys,
  composeFromIntent,
  composeFromSource,
  composeFromSelection,
  isDirectSectionsFixture,
  isSourceSelectionFixture,
  normalizeTransientPresentation,
  validateTransientProofSurface,
} from './lib/transientClient'
import {
  assertEmbeddedManifestConsistency,
  discoverResults,
  getPresenterStatus,
  getPresenterTrace,
  getResultManifest,
  getResultPresentation,
  normalizeOptionalText,
} from './lib/resultsClient'
import type { ManifestLike, PagePresentation, TraceLike } from './types/presentation'
import type { AnalysisResultManifest, DiscoverySummary } from './types/results'
import type {
  ComposeFromIntentApiResponse,
  TransientProofFixture,
} from './lib/transientClient'

type Mode = 'artifact' | 'live' | 'transient_proof'
type TransientProofCaseKey =
  | 'source_selection'
  | 'source_profile_dossier'
  | 'source_profile_comparison'
  | 'genealogy_direct_sections'
type StatusPayload = Record<string, unknown>

type LiveKind =
  | 'config_missing'
  | 'discovering'
  | 'discovery_empty'
  | 'discovery_error'
  | 'loading_manifest'
  | 'manifest_error'
  | 'manifest_unavailable'
  | 'loading_presentation'
  | 'presentation_error'
  | 'ready'

interface LiveState {
  kind: LiveKind
  source: 'live'
  effectiveProjectId?: string
  effectiveWorkflowKey?: string
  resolvedJobId?: string
  discovery: DiscoverySummary | null
  manifest: AnalysisResultManifest | null
  page: PagePresentation | null
  trace: TraceLike | null
  status: StatusPayload | null
  statusUnavailable: boolean
  errorDetail: string | null
}

type TransientKind = 'idle' | 'loading' | 'ready' | 'error'

interface TransientState {
  kind: TransientKind
  source: 'transient_proof'
  page: PagePresentation | null
  response: ComposeFromIntentApiResponse | null
  errorDetail: string | null
  rawJsonLeafKeys: string[]
}

type LiveAction =
  | {
      type: 'CONFIG_MISSING'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
    }
  | {
      type: 'DISCOVERY_STARTED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
    }
  | {
      type: 'DISCOVERY_EMPTY'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      errorDetail: string
    }
  | {
      type: 'DISCOVERY_FAILED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      errorDetail: string
    }
  | {
      type: 'MANIFEST_STARTED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
    }
  | {
      type: 'MANIFEST_FAILED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
      errorDetail: string
    }
  | {
      type: 'MANIFEST_UNAVAILABLE'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
      manifest: AnalysisResultManifest
    }
  | {
      type: 'PRESENTATION_STARTED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
      manifest: AnalysisResultManifest
    }
  | {
      type: 'PRESENTATION_FAILED'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
      manifest: AnalysisResultManifest
      errorDetail: string
    }
  | {
      type: 'READY'
      effectiveProjectId?: string
      effectiveWorkflowKey?: string
      resolvedJobId: string
      discovery: DiscoverySummary | null
      manifest: AnalysisResultManifest
      page: PagePresentation
    }
  | {
      type: 'TRACE_LOADED'
      trace: TraceLike
    }
  | {
      type: 'STATUS_LOADED'
      status: StatusPayload
    }
  | {
      type: 'STATUS_UNAVAILABLE'
    }

const AOI_WORKFLOW_KEY = 'anxiety_of_influence_thematic_single_thinker'
const ANALYZER_V2_URL = import.meta.env.VITE_ANALYZER_V2_URL?.trim() ?? ''
const RESOLVED_ANALYZER_V2_URL =
  ANALYZER_V2_URL || (typeof window !== 'undefined' ? window.location.origin : '')
const ENV_AOI_MODE = import.meta.env.VITE_AOI_MODE as string | undefined
const DEFAULT_MODE: Mode =
  ENV_AOI_MODE === 'transient_proof'
    ? 'transient_proof'
    : ENV_AOI_MODE === 'live'
      ? 'live'
      : 'artifact'
const DEFAULT_DEBUG_JOB_ID = normalizeOptionalText(import.meta.env.VITE_AOI_JOB_ID) ?? ''
const DEFAULT_PROJECT_ID = normalizeOptionalText(import.meta.env.VITE_AOI_PROJECT_ID)
const DEFAULT_WORKFLOW_KEY =
  normalizeOptionalText(import.meta.env.VITE_AOI_WORKFLOW_KEY) ?? AOI_WORKFLOW_KEY
const CONSUMER_KEY = 'aoi-canary'
const RENDERER_SUMMARY = `${rendererRelease.renderer_package_version} · ${rendererRelease.renderer_tarball_sha256.slice(0, 8)}`
const DEFAULT_TRANSIENT_PROOF_CASE: TransientProofCaseKey = 'source_selection'
const TRANSIENT_PROOF_CASES: Record<TransientProofCaseKey, TransientProofFixture> = {
  source_selection: transientProofFixture as TransientProofFixture,
  source_profile_dossier: transientSourceProfileFixture as TransientProofFixture,
  source_profile_comparison: transientSourceProfileComparisonFixture as TransientProofFixture,
  genealogy_direct_sections: transientGenealogyDirectSectionsFixture as TransientProofFixture,
}
const TRANSIENT_PROOF_CASE_LABELS: Record<TransientProofCaseKey, string> = {
  source_selection: 'Source selection',
  source_profile_dossier: 'Source profile: dossier',
  source_profile_comparison: 'Source profile: comparison',
  genealogy_direct_sections: 'Genealogy: direct sections',
}

interface ArtifactState {
  page: PagePresentation
  manifest: ManifestLike
  trace: TraceLike
  status: StatusPayload
}

const ARTIFACT_STATE: ArtifactState = {
  page: artifactPage as PagePresentation,
  manifest: artifactManifest as ManifestLike,
  trace: artifactTrace as TraceLike,
  status: { artifacts_ready: true, source: 'artifact' },
}

function createLiveState(kind: LiveKind, patch: Partial<LiveState> = {}): LiveState {
  return {
    kind,
    source: 'live',
    effectiveProjectId: patch.effectiveProjectId,
    effectiveWorkflowKey: patch.effectiveWorkflowKey ?? DEFAULT_WORKFLOW_KEY,
    resolvedJobId: patch.resolvedJobId,
    discovery: patch.discovery ?? null,
    manifest: patch.manifest ?? null,
    page: patch.page ?? null,
    trace: patch.trace ?? null,
    status: patch.status ?? null,
    statusUnavailable: patch.statusUnavailable ?? false,
    errorDetail: patch.errorDetail ?? null,
  }
}

function transitionLiveState(
  current: LiveState,
  kind: LiveKind,
  patch: Partial<LiveState> = {},
): LiveState {
  return createLiveState(kind, {
    ...current,
    ...patch,
  })
}

function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'CONFIG_MISSING':
      return createLiveState('config_missing', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
      })
    case 'DISCOVERY_STARTED':
      return createLiveState('discovering', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
      })
    case 'DISCOVERY_EMPTY':
      return createLiveState('discovery_empty', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        errorDetail: action.errorDetail,
      })
    case 'DISCOVERY_FAILED':
      return createLiveState('discovery_error', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        errorDetail: action.errorDetail,
      })
    case 'MANIFEST_STARTED':
      return createLiveState('loading_manifest', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
      })
    case 'MANIFEST_FAILED':
      return createLiveState('manifest_error', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
        errorDetail: action.errorDetail,
      })
    case 'MANIFEST_UNAVAILABLE':
      return transitionLiveState(state, 'manifest_unavailable', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
        manifest: action.manifest,
        page: null,
        errorDetail: null,
      })
    case 'PRESENTATION_STARTED':
      return transitionLiveState(state, 'loading_presentation', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
        manifest: action.manifest,
        page: null,
        errorDetail: null,
      })
    case 'PRESENTATION_FAILED':
      return transitionLiveState(state, 'presentation_error', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
        manifest: action.manifest,
        page: null,
        errorDetail: action.errorDetail,
      })
    case 'READY':
      return transitionLiveState(state, 'ready', {
        effectiveProjectId: action.effectiveProjectId,
        effectiveWorkflowKey: action.effectiveWorkflowKey,
        resolvedJobId: action.resolvedJobId,
        discovery: action.discovery,
        manifest: action.manifest,
        page: action.page,
        errorDetail: null,
      })
    case 'TRACE_LOADED':
      return {
        ...state,
        trace: action.trace,
      }
    case 'STATUS_LOADED':
      return {
        ...state,
        status: action.status,
        statusUnavailable: false,
      }
    case 'STATUS_UNAVAILABLE':
      return {
        ...state,
        status: null,
        statusUnavailable: true,
      }
    default:
      return state
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

function buildInitialLiveState(): LiveState {
  return createLiveState('discovering', {
    effectiveProjectId: DEFAULT_PROJECT_ID,
    effectiveWorkflowKey: DEFAULT_WORKFLOW_KEY,
    resolvedJobId: normalizeOptionalText(DEFAULT_DEBUG_JOB_ID),
  })
}

function buildInitialTransientState(): TransientState {
  return {
    kind: 'idle',
    source: 'transient_proof',
    page: null,
    response: null,
    errorDetail: null,
    rawJsonLeafKeys: [],
  }
}

function getTransientFixtureIdentity(fixture: TransientProofFixture): string {
  return isSourceSelectionFixture(fixture) || isDirectSectionsFixture(fixture)
    ? fixture.planning_decision_id
    : `${fixture.request.source_v2_job_id}:${fixture.request.profile}`
}

function getTransientProofCaseKey(fixture: TransientProofFixture): TransientProofCaseKey {
  if (fixture.request_kind === 'source_selection') {
    return 'source_selection'
  }
  if (fixture.request_kind === 'direct_sections') {
    return 'genealogy_direct_sections'
  }
  return fixture.request.profile === 'comparison'
    ? 'source_profile_comparison'
    : 'source_profile_dossier'
}

function buildTransientStatusLabel(
  transientState: TransientState,
  fixture: TransientProofFixture,
): string {
  const proofLabel = TRANSIENT_PROOF_CASE_LABELS[getTransientProofCaseKey(fixture)]
  switch (transientState.kind) {
    case 'loading':
      return `Loading transient compose proof (${proofLabel})…`
    case 'ready':
      return transientState.rawJsonLeafKeys.length
        ? `Transient proof loaded (${proofLabel}, bounded raw_json fallback)`
        : `Transient proof loaded (${proofLabel})`
    case 'error':
      return `Transient proof error: ${transientState.errorDetail}`
    case 'idle':
    default:
      return 'Transient proof mode'
  }
}

function buildTransientSurfaceMessage(
  transientState: TransientState,
  fixture: TransientProofFixture,
): { title: string; detail: string } {
  const requestDescription =
    fixture.request_kind === 'source_selection'
      ? 'compose-from-selection request fixture'
      : fixture.request_kind === 'source_profile'
        ? `compose-from-source ${fixture.request.profile} request fixture`
        : 'compose-from-intent direct-sections request fixture'
  switch (transientState.kind) {
    case 'loading':
      return {
        title: 'Loading transient compose proof',
        detail:
          `Replaying the pinned analyzer-owned ${requestDescription} through the transient compose seam.`,
      }
    case 'error':
      return {
        title: 'Transient compose proof failed',
        detail: transientState.errorDetail ?? 'Transient compose proof failed before any page was rendered.',
      }
    case 'ready':
      return {
        title: 'Transient compose proof loaded',
        detail:
          transientState.rawJsonLeafKeys.length === 0
            ? 'Transient response rendered without renderer degradation.'
            : `Transient response rendered with bounded analyzer-side fallback on ${transientState.rawJsonLeafKeys.join(', ')}.`,
      }
    case 'idle':
    default:
      return {
        title: 'Transient proof is ready',
        detail: 'Select Transient to replay the pinned analyzer-owned request fixture.',
      }
  }
}

function buildTransientStrategyCopy(
  transientState: TransientState,
  fixture: TransientProofFixture,
): string {
  switch (transientState.kind) {
    case 'loading':
      return fixture.request_kind === 'source_selection'
        ? 'Replaying the pinned AOI source-selection request fixture through analyzer transient compose.'
        : fixture.request_kind === 'source_profile'
          ? `Replaying the pinned AOI source-profile ${fixture.request.profile} request fixture through analyzer transient compose.`
          : 'Replaying the pinned genealogy direct-sections request fixture through analyzer transient compose.'
    case 'ready':
      return fixture.display.strategy_summary
    case 'error':
      return transientState.errorDetail ?? 'Transient compose proof failed.'
    case 'idle':
    default:
      return fixture.display.strategy_summary
  }
}

function buildLiveStatusLabel(liveState: LiveState): string {
  switch (liveState.kind) {
    case 'config_missing':
      return 'Live discovery is not configured'
    case 'discovering':
      return 'Discovering latest result…'
    case 'discovery_empty':
      return 'No discoverable AOI result found'
    case 'discovery_error':
      return `Live discovery error: ${liveState.errorDetail}`
    case 'loading_manifest':
      return 'Loading result manifest…'
    case 'manifest_error':
      return `Result manifest error: ${liveState.errorDetail}`
    case 'manifest_unavailable':
      return 'Result manifest loaded (presentation unavailable)'
    case 'loading_presentation':
      return 'Loading result presentation…'
    case 'presentation_error':
      return `Result presentation error: ${liveState.errorDetail}`
    case 'ready':
      return liveState.statusUnavailable
        ? 'Live result loaded (status unavailable)'
        : 'Live result loaded'
    default:
      return 'Live mode'
  }
}

function buildLiveSurfaceMessage(liveState: LiveState): { title: string; detail: string } {
  switch (liveState.kind) {
    case 'config_missing':
      return {
        title: 'Live discovery needs a project',
        detail:
          'Set VITE_AOI_PROJECT_ID or provide ?project_id=... to enable discovery-first live mode. Manual debug Job ID still bypasses discovery.',
      }
    case 'discovering':
      return {
        title: 'Looking for the latest AOI result',
        detail: 'Waiting for analyzer discovery to resolve the most recent completed result.',
      }
    case 'discovery_empty':
      return {
        title: 'No AOI result discovered',
        detail:
          liveState.errorDetail ??
          `No completed AOI result is discoverable for project ${liveState.effectiveProjectId ?? 'unset'} and workflow ${liveState.effectiveWorkflowKey ?? DEFAULT_WORKFLOW_KEY}.`,
      }
    case 'discovery_error':
      return {
        title: 'Live discovery failed',
        detail: liveState.errorDetail ?? 'Discovery failed before any result could be selected.',
      }
    case 'loading_manifest':
      return {
        title: 'Loading result manifest',
        detail: `Fetching manifest contract for ${liveState.resolvedJobId ?? 'the discovered result'} before any page assembly is attempted.`,
      }
    case 'manifest_error':
      return {
        title: 'Result manifest failed',
        detail: liveState.errorDetail ?? 'Analyzer returned an error while loading result manifest.',
      }
    case 'manifest_unavailable':
      return {
        title: 'Result is not currently restorable',
        detail: `restore_reason=${liveState.manifest?.restore_reason ?? 'unknown'} · result_state=${liveState.manifest?.result_state ?? 'unknown'} · presentation_status=${liveState.manifest?.presentation_status ?? 'unknown'}`,
      }
    case 'loading_presentation':
      return {
        title: 'Loading result presentation',
        detail: 'Manifest confirms the result is ready. Fetching the presentation payload now.',
      }
    case 'presentation_error':
      return {
        title: 'Result presentation failed',
        detail: liveState.errorDetail ?? 'Analyzer failed while building the presentation payload.',
      }
    case 'ready':
      return {
        title: 'No AOI page available',
        detail: 'No presentation payload was loaded.',
      }
    default:
      return {
        title: 'No AOI page available',
        detail: 'No presentation payload was loaded.',
      }
  }
}

function buildStrategyCopy(liveState: LiveState): string {
  switch (liveState.kind) {
    case 'manifest_unavailable':
      return `Manifest truth says this result cannot currently be restored (${liveState.manifest?.restore_reason ?? 'unknown reason'}).`
    case 'presentation_error':
      return `Manifest loaded successfully for ${liveState.resolvedJobId ?? 'the selected result'}, but presentation fetch failed: ${liveState.errorDetail ?? 'unknown error'}.`
    case 'manifest_error':
    case 'discovery_error':
      return liveState.errorDetail ?? 'Live result-contract fetch failed.'
    case 'discovery_empty':
      return liveState.errorDetail ?? 'Analyzer discovery found no matching AOI result.'
    case 'config_missing':
      return 'Configure a project_id for discovery-first live mode, or use a manual debug job ID.'
    case 'loading_manifest':
    case 'loading_presentation':
    case 'discovering':
      return 'Waiting for result-contract data from analyzer-v2.'
    case 'ready':
      return 'Live result contract loaded.'
    default:
      return 'Waiting for result-contract data from analyzer-v2.'
  }
}

function getResolvedLiveScope() {
  if (typeof window === 'undefined') {
    return {
      projectId: DEFAULT_PROJECT_ID,
      workflowKey: DEFAULT_WORKFLOW_KEY,
    }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    projectId: normalizeOptionalText(params.get('project_id')) ?? DEFAULT_PROJECT_ID,
    workflowKey: normalizeOptionalText(params.get('workflow_key')) ?? DEFAULT_WORKFLOW_KEY,
  }
}

function buildImmediateLiveResetAction(
  debugJobIdInput: string,
  effectiveProjectId: string | undefined,
  effectiveWorkflowKey: string,
): LiveAction {
  const resolvedDebugJobId = normalizeOptionalText(debugJobIdInput)

  if (resolvedDebugJobId) {
    return {
      type: 'MANIFEST_STARTED',
      effectiveProjectId,
      effectiveWorkflowKey,
      resolvedJobId: resolvedDebugJobId,
      discovery: null,
    }
  }

  if (!effectiveProjectId) {
    return {
      type: 'CONFIG_MISSING',
      effectiveProjectId,
      effectiveWorkflowKey,
    }
  }

  return {
    type: 'DISCOVERY_STARTED',
    effectiveProjectId,
    effectiveWorkflowKey,
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE)
  const [jobIdInput, setJobIdInput] = useState(DEFAULT_DEBUG_JOB_ID)
  const [liveState, dispatchLive] = useReducer(liveReducer, undefined, buildInitialLiveState)
  const [transientState, setTransientState] = useState<TransientState>(buildInitialTransientState)
  const [transientProofCase, setTransientProofCase] =
    useState<TransientProofCaseKey>(DEFAULT_TRANSIENT_PROOF_CASE)
  const [debugOpen, setDebugOpen] = useState(false)

  const resolvedScope = useMemo(() => getResolvedLiveScope(), [])
  const canUseLiveMode = Boolean(RESOLVED_ANALYZER_V2_URL)
  const canUseTransientMode = Boolean(RESOLVED_ANALYZER_V2_URL)
  const activeTransientFixture = TRANSIENT_PROOF_CASES[transientProofCase]
  const resetLiveStateForInput = (nextJobIdInput: string) => {
    dispatchLive(
      buildImmediateLiveResetAction(
        nextJobIdInput,
        resolvedScope.projectId,
        resolvedScope.workflowKey,
      ),
    )
  }

  useEffect(() => {
    if (mode !== 'live') return

    const debugJobId = normalizeOptionalText(jobIdInput)
    const effectiveProjectId = resolvedScope.projectId
    const effectiveWorkflowKey = resolvedScope.workflowKey

    let cancelled = false

    const fetchDebugPayloads = (resolvedJobId: string) => {
      getPresenterTrace({
        baseUrl: RESOLVED_ANALYZER_V2_URL,
        job_id: resolvedJobId,
        consumer_key: CONSUMER_KEY,
      })
        .then((trace) => {
          if (cancelled) return
          dispatchLive({ type: 'TRACE_LOADED', trace })
        })
        .catch(() => {
          if (cancelled) return
        })

      getPresenterStatus({
        baseUrl: RESOLVED_ANALYZER_V2_URL,
        job_id: resolvedJobId,
        consumer_key: CONSUMER_KEY,
      })
        .then((status) => {
          if (cancelled) return
          dispatchLive({ type: 'STATUS_LOADED', status })
        })
        .catch(() => {
          if (cancelled) return
          dispatchLive({ type: 'STATUS_UNAVAILABLE' })
        })
    }

    const loadPresentationForJob = async (
      resolvedJobId: string,
      discovery: DiscoverySummary | null,
    ) => {
      dispatchLive({
        type: 'MANIFEST_STARTED',
        effectiveProjectId,
        effectiveWorkflowKey,
        resolvedJobId,
        discovery,
      })
      fetchDebugPayloads(resolvedJobId)

      try {
        const manifest = await getResultManifest({
          baseUrl: RESOLVED_ANALYZER_V2_URL,
          job_id: resolvedJobId,
          consumer_key: CONSUMER_KEY,
        })
        if (cancelled) return

        if (!manifest.restore_available || manifest.presentation_status !== 'completed') {
          dispatchLive({
            type: 'MANIFEST_UNAVAILABLE',
            effectiveProjectId,
            effectiveWorkflowKey,
            resolvedJobId,
            discovery,
            manifest,
          })
          return
        }

        dispatchLive({
          type: 'PRESENTATION_STARTED',
          effectiveProjectId,
          effectiveWorkflowKey,
          resolvedJobId,
          discovery,
          manifest,
        })

        try {
          const presentationResponse = await getResultPresentation({
            baseUrl: RESOLVED_ANALYZER_V2_URL,
            job_id: resolvedJobId,
            consumer_key: CONSUMER_KEY,
          })
          if (cancelled) return

          assertEmbeddedManifestConsistency(manifest, presentationResponse.manifest)

          if (!presentationResponse.presentation) {
            dispatchLive({
              type: 'PRESENTATION_FAILED',
              effectiveProjectId,
              effectiveWorkflowKey,
              resolvedJobId,
              discovery,
              manifest,
              errorDetail: 'Result presentation returned no page payload.',
            })
            return
          }

          dispatchLive({
            type: 'READY',
            effectiveProjectId,
            effectiveWorkflowKey,
            resolvedJobId,
            discovery,
            manifest,
            page: presentationResponse.presentation,
          })
        } catch (error) {
          if (cancelled) return
          dispatchLive({
            type: 'PRESENTATION_FAILED',
            effectiveProjectId,
            effectiveWorkflowKey,
            resolvedJobId,
            discovery,
            manifest,
            errorDetail: toErrorMessage(error),
          })
        }
      } catch (error) {
        if (cancelled) return
        dispatchLive({
          type: 'MANIFEST_FAILED',
          effectiveProjectId,
          effectiveWorkflowKey,
          resolvedJobId,
          discovery,
          errorDetail: toErrorMessage(error),
        })
      }
    }

    if (debugJobId) {
      void loadPresentationForJob(debugJobId, null)
      return () => {
        cancelled = true
      }
    }

    if (!effectiveProjectId) {
      dispatchLive({
        type: 'CONFIG_MISSING',
        effectiveProjectId,
        effectiveWorkflowKey,
      })
      return () => {
        cancelled = true
      }
    }

    dispatchLive({
      type: 'DISCOVERY_STARTED',
      effectiveProjectId,
      effectiveWorkflowKey,
    })

    discoverResults({
      baseUrl: RESOLVED_ANALYZER_V2_URL,
      project_id: effectiveProjectId,
      workflow_key: effectiveWorkflowKey,
      consumer_key: CONSUMER_KEY,
      limit: 1,
    })
      .then((results) => {
        if (cancelled) return
        const discovery = results[0] ?? null
        if (!discovery) {
          dispatchLive({
            type: 'DISCOVERY_EMPTY',
            effectiveProjectId,
            effectiveWorkflowKey,
            errorDetail: `No completed AOI result is discoverable for project ${effectiveProjectId} and workflow ${effectiveWorkflowKey}.`,
          })
          return
        }
        void loadPresentationForJob(discovery.job_id, discovery)
      })
      .catch((error) => {
        if (cancelled) return
        dispatchLive({
          type: 'DISCOVERY_FAILED',
          effectiveProjectId,
          effectiveWorkflowKey,
          errorDetail: toErrorMessage(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [jobIdInput, mode, resolvedScope.projectId, resolvedScope.workflowKey])

  useEffect(() => {
    if (mode !== 'transient_proof') return

    let cancelled = false
    setTransientState({
      kind: 'loading',
      source: 'transient_proof',
      page: null,
      response: null,
      errorDetail: null,
      rawJsonLeafKeys: [],
    })

    const requestPromise =
      activeTransientFixture.request_kind === 'source_selection'
        ? composeFromSelection({
            baseUrl: RESOLVED_ANALYZER_V2_URL,
            request: activeTransientFixture.request,
          })
        : activeTransientFixture.request_kind === 'source_profile'
          ? composeFromSource({
              baseUrl: RESOLVED_ANALYZER_V2_URL,
              request: activeTransientFixture.request,
            })
          : composeFromIntent({
              baseUrl: RESOLVED_ANALYZER_V2_URL,
              request: activeTransientFixture.request,
            })

    requestPromise
      .then((response) => {
        if (cancelled) return

        const page = normalizeTransientPresentation(activeTransientFixture, response)
        const rawJsonLeafKeys = collectRawJsonLeafKeys(page.views)
        const proofSurfaceError = validateTransientProofSurface(page, activeTransientFixture)

        if (proofSurfaceError) {
          setTransientState({
            kind: 'error',
            source: 'transient_proof',
            page,
            response,
            errorDetail: proofSurfaceError,
            rawJsonLeafKeys,
          })
          return
        }

        setTransientState({
          kind: 'ready',
          source: 'transient_proof',
          page,
          response,
          errorDetail: null,
          rawJsonLeafKeys,
        })
      })
      .catch((error) => {
        if (cancelled) return
        setTransientState({
          kind: 'error',
          source: 'transient_proof',
          page: null,
          response: null,
          errorDetail: toErrorMessage(error),
          rawJsonLeafKeys: [],
        })
      })

    return () => {
      cancelled = true
    }
  }, [activeTransientFixture, mode])

  const page =
    mode === 'live'
      ? liveState.page
      : mode === 'transient_proof'
        ? (transientState.kind === 'ready' ? transientState.page : null)
        : ARTIFACT_STATE.page
  const manifest =
    mode === 'live'
      ? liveState.manifest
      : mode === 'transient_proof'
        ? activeTransientFixture
        : ARTIFACT_STATE.manifest
  const trace =
    mode === 'live'
      ? liveState.trace
      : mode === 'transient_proof'
        ? (transientState.response?.trace ?? null)
        : ARTIFACT_STATE.trace
  const debugStatus =
    mode === 'live'
      ? liveState.status
      : mode === 'transient_proof'
        ? {
            kind: transientState.kind,
            raw_json_leaf_keys: transientState.rawJsonLeafKeys,
            proof_case: transientProofCase,
            proof_bundle_identity: activeTransientFixture.proof_bundle_identity,
            compose_call: activeTransientFixture.compose_call,
            error_detail: transientState.errorDetail,
          }
        : ARTIFACT_STATE.status
  const liveStatusLabel =
    mode === 'live'
      ? buildLiveStatusLabel(liveState)
      : mode === 'transient_proof'
        ? buildTransientStatusLabel(transientState, activeTransientFixture)
        : 'Frozen artifact-backed mode'
  const rootView = page?.views?.[0] ?? null
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
  const liveSurfaceMessage =
    mode === 'live'
      ? buildLiveSurfaceMessage(liveState)
      : mode === 'transient_proof'
        ? buildTransientSurfaceMessage(transientState, activeTransientFixture)
        : null
  const strategyCopy =
    mode === 'live'
      ? activeSummary?.strategySummary ?? buildStrategyCopy(liveState)
      : mode === 'transient_proof'
        ? activeSummary?.strategySummary ?? buildTransientStrategyCopy(transientState, activeTransientFixture)
      : activeSummary?.strategySummary ?? 'Waiting for presenter data.'

  const liveScopeSummary =
    mode === 'live'
      ? {
          projectId: liveState.effectiveProjectId ?? 'unset',
          workflowKey: liveState.effectiveWorkflowKey ?? DEFAULT_WORKFLOW_KEY,
          resolvedJobId: liveState.resolvedJobId ?? 'pending',
          resultState: liveState.manifest?.result_state ?? 'pending',
          restore: liveState.manifest
            ? liveState.manifest.restore_available
              ? 'available'
              : liveState.manifest.restore_reason
            : 'pending',
          completedAt: liveState.discovery?.completed_at ?? 'n/a',
        }
      : null

  return (
    <DesignTokenProvider schoolKey={activeSummary?.styleSchool ?? ''}>
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">AOI Thin Consumer Canary</p>
            <h1>Benanav vs Otto Neurath</h1>
            <p className="lede">
              Separate app canary over analyzer-v2 AOI output. This app now uses analyzer-owned result
              discovery, manifest, and presentation contracts for live proof mode, plus one bounded
              transient compose proof mode over analyzer-owned AOI source-selection and source-profile
              truth.
            </p>
          </div>

          <div className="mode-controls">
            <div className="mode-toggle" role="group" aria-label="Mode switcher">
              <button
                type="button"
                className={mode === 'artifact' ? 'active' : ''}
              onClick={() => {
                setMode('artifact')
              }}
              >
                Artifact
              </button>
              <button
                type="button"
                className={mode === 'live' ? 'active' : ''}
                onClick={() => {
                  setMode('live')
                  resetLiveStateForInput(jobIdInput)
                }}
                disabled={!canUseLiveMode}
              >
                Live
              </button>
              <button
                type="button"
                className={mode === 'transient_proof' ? 'active' : ''}
                onClick={() => {
                  setMode('transient_proof')
                }}
                disabled={!canUseTransientMode}
              >
                Transient
              </button>
            </div>

            <label className="job-input">
              <span>Debug Job ID (optional)</span>
              <input
                value={jobIdInput}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setJobIdInput(nextValue)
                  if (mode === 'live') {
                    resetLiveStateForInput(nextValue)
                  }
                }}
                placeholder="Leave blank to use discovery-first live mode"
                disabled={mode !== 'live'}
              />
              <small>Blank uses analyzer discovery. Any value becomes a debug override.</small>
            </label>

            {mode === 'transient_proof' ? (
              <div className="proof-selector">
                <span>Transient Proof Case</span>
                <div className="proof-selector__buttons" role="group" aria-label="Transient proof selector">
                  {(
                    Object.keys(TRANSIENT_PROOF_CASES) as TransientProofCaseKey[]
                  ).map((proofCaseKey) => (
                    <button
                      key={proofCaseKey}
                      type="button"
                      className={transientProofCase === proofCaseKey ? 'active' : ''}
                      onClick={() => {
                        setTransientProofCase(proofCaseKey)
                      }}
                    >
                      {TRANSIENT_PROOF_CASE_LABELS[proofCaseKey]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
            <span className="status-label">Project</span>
            <strong>
              {mode === 'live'
                ? liveScopeSummary?.projectId
                : mode === 'transient_proof'
                  ? TRANSIENT_PROOF_CASE_LABELS[transientProofCase]
                  : 'artifact'}
            </strong>
          </div>
          <div className="status-card status-wide">
            <span className="status-label">Workflow</span>
            <strong>
              {mode === 'live'
                ? liveScopeSummary?.workflowKey
                : mode === 'transient_proof'
                  ? activeTransientFixture.request.workflow_key
                  : AOI_WORKFLOW_KEY}
            </strong>
          </div>
          <div className="status-card status-wide">
            <span className="status-label">Renderer</span>
            <strong>{RENDERER_SUMMARY}</strong>
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
            <span className="status-label">Resolved Job</span>
            <strong>
              {mode === 'live'
                ? liveScopeSummary?.resolvedJobId
                : mode === 'transient_proof'
                  ? `transient:${getTransientFixtureIdentity(activeTransientFixture)}`
                  : activeSummary?.jobId}
            </strong>
          </div>
        </section>

        {activeSummary || liveScopeSummary ? (
          <section className="meta-grid">
            <article className="meta-card">
              <span>Thinker</span>
              <strong>
                {activeSummary?.thinkerName ??
                  (mode === 'transient_proof'
                    ? activeTransientFixture.display.thinker_name
                    : 'Waiting for live presentation')}
              </strong>
            </article>
            <article className="meta-card">
              <span>Plan</span>
              <strong>{activeSummary?.planId ?? liveState.manifest?.plan_id ?? 'pending'}</strong>
            </article>
            <article className="meta-card">
              <span>Views</span>
              <strong>{activeSummary?.viewCount ?? 0}</strong>
            </article>
            <article className="meta-card">
              <span>Result</span>
              <strong>
                {mode === 'live' ? liveScopeSummary?.resultState : mode === 'transient_proof' ? 'transient' : 'artifact'}
              </strong>
            </article>
            <article className="meta-card">
              <span>Restore</span>
              <strong>
                {mode === 'live' ? liveScopeSummary?.restore : mode === 'transient_proof' ? 'n/a' : 'artifact'}
              </strong>
            </article>
            <article className="meta-card">
              <span>Completed</span>
              <strong>{mode === 'live' ? liveScopeSummary?.completedAt : 'fixture'}</strong>
            </article>
          </section>
        ) : null}

        <section className="strategy-card">
          <span className="status-label">Strategy Summary</span>
          <p>{strategyCopy}</p>
        </section>

        <section className="canary-surface">
          {!rootView ? (
            <div className="empty-state">
              <h2>{mode === 'artifact' ? 'No AOI page available' : liveSurfaceMessage?.title}</h2>
              <p>
                {mode === 'artifact' ? 'No page payload is loaded yet.' : liveSurfaceMessage?.detail}
              </p>
            </div>
          ) : rootView.renderer_type === 'tab' ? (
            <TabShell
              view={rootView}
              renderView={(view) => <RendererHost key={view.view_key} view={view} />}
            />
          ) : (
            <RendererHost view={rootView} />
          )}
        </section>

        <section className="debug-panel">
          <button type="button" className="debug-toggle" onClick={() => setDebugOpen((open) => !open)}>
            {debugOpen ? 'Hide' : 'Show'} Debug Payloads
          </button>
          {debugOpen ? (
            <div className="debug-grid">
              <DebugCard title="Renderer Build" data={rendererRelease} />
              {mode === 'live' ? <DebugCard title="Live State" data={liveState} /> : null}
              {mode === 'live' ? <DebugCard title="Discovery" data={liveState.discovery} /> : null}
              {mode === 'transient_proof' ? (
                <DebugCard title="Transient Fixture" data={activeTransientFixture} />
              ) : (
                <DebugCard title="Manifest" data={manifest} />
              )}
              {mode === 'transient_proof' ? (
                <DebugCard title="Transient Response" data={transientState.response} />
              ) : null}
              <DebugCard title="Trace" data={trace} />
              <DebugCard title="Status" data={debugStatus} />
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
