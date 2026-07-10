import type {
  AnalysisResultManifest,
  AnalysisResultPresentationResponse,
  DiscoverySummary,
} from '../types/results'
import type { TraceLike } from '../types/presentation'

interface DiscoveryRequest {
  baseUrl: string
  project_id: string
  workflow_key: string
  consumer_key: string
  selected_source_thinker_id?: string
  limit?: number
}

interface JobRequest {
  baseUrl: string
  job_id: string
  consumer_key: string
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    searchParams.set(key, String(value))
  }
  return searchParams.toString()
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json() as Promise<T>
}

export function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export async function discoverResults({
  baseUrl,
  project_id,
  workflow_key,
  consumer_key,
  selected_source_thinker_id,
  limit = 1,
}: DiscoveryRequest): Promise<DiscoverySummary[]> {
  const query = buildQueryString({
    project_id,
    workflow_key,
    consumer_key,
    selected_source_thinker_id,
    limit,
  })
  return fetchJson<DiscoverySummary[]>(`${baseUrl}/v1/results/discovery?${query}`)
}

export async function getResultManifest({
  baseUrl,
  job_id,
  consumer_key,
}: JobRequest): Promise<AnalysisResultManifest> {
  const query = buildQueryString({ consumer_key })
  return fetchJson<AnalysisResultManifest>(`${baseUrl}/v1/results/by-job/${job_id}?${query}`)
}

export async function getResultPresentation({
  baseUrl,
  job_id,
  consumer_key,
}: JobRequest): Promise<AnalysisResultPresentationResponse> {
  const query = buildQueryString({ consumer_key })
  return fetchJson<AnalysisResultPresentationResponse>(
    `${baseUrl}/v1/results/by-job/${job_id}/presentation?${query}`,
  )
}

export async function getPresenterTrace({
  baseUrl,
  job_id,
  consumer_key,
}: JobRequest): Promise<TraceLike> {
  const query = buildQueryString({ consumer_key })
  return fetchJson<TraceLike>(`${baseUrl}/v1/presenter/trace/${job_id}?${query}`)
}

export async function getPresenterStatus({
  baseUrl,
  job_id,
  consumer_key,
}: JobRequest): Promise<Record<string, unknown>> {
  const query = buildQueryString({ consumer_key })
  return fetchJson<Record<string, unknown>>(`${baseUrl}/v1/presenter/status/${job_id}?${query}`)
}

export function assertEmbeddedManifestConsistency(
  expected: AnalysisResultManifest,
  received: AnalysisResultManifest,
): void {
  if (!import.meta.env.DEV) return
  if (expected.job_id !== received.job_id || expected.consumer_key !== received.consumer_key) {
    throw new Error(
      [
        'Embedded manifest mismatch in result presentation response.',
        `expected=${expected.job_id}/${expected.consumer_key}`,
        `received=${received.job_id}/${received.consumer_key}`,
      ].join(' '),
    )
  }
}
