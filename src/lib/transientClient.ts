import type { PagePresentation, ViewPayload } from '../types/presentation'

export interface SelectedSourceInput {
  source_family_key: string
  selection_rank: number
  rationale: string
}

export interface ComposeFromSelectionRequestPayload {
  workflow_key: string
  consumer_key: string
  source_v2_job_id: string
  selection: SelectedSourceInput[]
  user_intent: string
  selection_summary?: string
  legacy_profile_equivalent?: string | null
  style_school?: string | null
}

export interface ComposeFromSourceRequestPayload {
  workflow_key: string
  consumer_key: string
  source_v2_job_id: string
  profile: 'dossier' | 'comparison'
  user_intent?: string | null
  style_school?: string | null
}

export interface ComposeFromIntentSectionInput {
  engine_key: string
  title: string
  prose: string
}

export interface ComposeFromIntentRequestPayload {
  workflow_key: string
  consumer_key: string
  user_intent: string
  prose_sections: ComposeFromIntentSectionInput[]
  style_school?: string | null
  audience?: string | null
}

interface BaseTransientProofFixture<TRequestKind extends string, TRequest> {
  request_kind: TRequestKind
  proof_fixture_key: string
  proof_bundle_identity: string
  display: {
    thinker_name: string
    strategy_summary: string
  }
  compose_call: {
    method: string
    endpoint: string
  }
  expected_root_renderer: string
  expected_raw_json_view_keys: string[]
  request: TRequest
}

export interface SourceSelectionTransientProofFixture
  extends BaseTransientProofFixture<'source_selection', ComposeFromSelectionRequestPayload> {
  planning_decision_id: string
}

export interface SourceProfileTransientProofFixture
  extends BaseTransientProofFixture<'source_profile', ComposeFromSourceRequestPayload> {}

export interface DirectSectionsTransientProofFixture
  extends BaseTransientProofFixture<'direct_sections', ComposeFromIntentRequestPayload> {
  planning_decision_id: string
}

export type TransientProofFixture =
  | SourceSelectionTransientProofFixture
  | SourceProfileTransientProofFixture
  | DirectSectionsTransientProofFixture

export type AnyComposeRequestPayload =
  | ComposeFromSelectionRequestPayload
  | ComposeFromSourceRequestPayload
  | ComposeFromIntentRequestPayload

export function isSourceSelectionFixture(
  fixture: TransientProofFixture,
): fixture is SourceSelectionTransientProofFixture {
  return fixture.request_kind === 'source_selection'
}

export function isDirectSectionsFixture(
  fixture: TransientProofFixture,
): fixture is DirectSectionsTransientProofFixture {
  return fixture.request_kind === 'direct_sections'
}

export interface TransientIntentViewResponse {
  view_key: string
  view_name: string
  description: string
  renderer_type: string
  renderer_config?: Record<string, unknown>
  structured_data?: unknown
  items?: Array<Record<string, unknown>> | null
  children?: TransientIntentViewResponse[]
}

export interface ComposeFromIntentApiResponse {
  presentation: {
    workflow_key: string
    consumer_key: string
    style_school?: string
    resolver_version: string
    views: TransientIntentViewResponse[]
    view_count: number
  }
  generated_view_definitions: Array<Record<string, unknown>>
  trace: {
    resolver_version: string
    entries: Array<Record<string, unknown>>
  }
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json() as Promise<T>
}

export async function composeFromSelection({
  baseUrl,
  request,
}: {
  baseUrl: string
  request: ComposeFromSelectionRequestPayload
}): Promise<ComposeFromIntentApiResponse> {
  return fetchJson<ComposeFromIntentApiResponse>(`${baseUrl}/v1/presenter/compose-from-selection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function composeFromSource({
  baseUrl,
  request,
}: {
  baseUrl: string
  request: ComposeFromSourceRequestPayload
}): Promise<ComposeFromIntentApiResponse> {
  return fetchJson<ComposeFromIntentApiResponse>(`${baseUrl}/v1/presenter/compose-from-source`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function composeFromIntent({
  baseUrl,
  request,
}: {
  baseUrl: string
  request: ComposeFromIntentRequestPayload
}): Promise<ComposeFromIntentApiResponse> {
  return fetchJson<ComposeFromIntentApiResponse>(`${baseUrl}/v1/presenter/compose-from-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export function normalizeTransientPresentation(
  fixture: TransientProofFixture,
  response: ComposeFromIntentApiResponse,
): PagePresentation {
  const transientIdentity = isSourceSelectionFixture(fixture) || isDirectSectionsFixture(fixture)
    ? fixture.planning_decision_id
    : `${fixture.request.source_v2_job_id}:${fixture.request.profile}`

  return {
    job_id: `transient:${transientIdentity}`,
    plan_id: transientIdentity,
    thinker_name: fixture.display.thinker_name,
    strategy_summary: fixture.display.strategy_summary,
    style_school: response.presentation.style_school,
    polish_state: 'raw',
    views: response.presentation.views.map(normalizeTransientView),
    view_count: response.presentation.view_count,
  }
}

export function collectRawJsonLeafKeys(views: ViewPayload[]): string[] {
  const rawJsonLeafKeys: string[] = []

  function walk(view: ViewPayload): void {
    if (!view.children.length && view.renderer_type === 'raw_json') {
      rawJsonLeafKeys.push(view.view_key)
      return
    }
    for (const child of view.children) {
      walk(child)
    }
  }

  for (const view of views) {
    walk(view)
  }

  return rawJsonLeafKeys
}

export function validateTransientProofSurface(
  page: PagePresentation,
  fixture: TransientProofFixture,
): string | null {
  const rootView = page.views[0]
  if (!rootView) {
    return 'Transient proof returned no page views.'
  }
  if (rootView.renderer_type !== fixture.expected_root_renderer) {
    return `Transient proof requires root renderer ${fixture.expected_root_renderer}; got ${rootView.renderer_type}.`
  }

  const rawJsonLeafKeys = collectRawJsonLeafKeys(page.views)
  if (rawJsonLeafKeys.length > 1) {
    return `Transient proof allows at most one raw_json leaf; got ${rawJsonLeafKeys.length}.`
  }

  const expected = [...fixture.expected_raw_json_view_keys].sort()
  const actual = [...rawJsonLeafKeys].sort()
  if (expected.length !== actual.length || expected.some((viewKey, index) => viewKey !== actual[index])) {
    return [
      'Transient proof raw_json leaf set drifted.',
      `expected=${expected.join(',') || 'none'}`,
      `actual=${actual.join(',') || 'none'}`,
    ].join(' ')
  }

  return null
}

function normalizeTransientView(view: TransientIntentViewResponse): ViewPayload {
  return {
    view_key: view.view_key,
    view_name: view.view_name,
    description: view.description,
    renderer_type: view.renderer_type,
    renderer_config: view.renderer_config ?? {},
    structured_data: view.structured_data ?? null,
    raw_prose: null,
    items: view.items ?? null,
    reading_scaffold: null,
    children: (view.children ?? []).map(normalizeTransientView),
  }
}
