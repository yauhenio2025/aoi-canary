import type { PagePresentation } from './presentation'

export interface AnalysisResultLinks {
  page_url: string
  presentation_url: string
  manifest_url: string
  trace_url: string
  refresh_presentation_url: string
}

export interface ArtifactSlotSummary {
  slot: string
  state: string
  artifact_ref?: string | null
  source_output_id?: string | null
  reuse_state?: string | null
  reused_from_job_id?: string | null
}

export interface ArtifactFamilySummary {
  artifact_family: string
  state: string
  format: string
  total_slots: number
  ready_slots: number
  pending_slots: number
  stale_slots: number
  unavailable_slots: number
  slots: ArtifactSlotSummary[]
}

export interface AnalysisResultManifest {
  job_id: string
  plan_id: string
  workflow_key: string
  consumer_key: string
  composition_mode?: string | null
  result_id: string
  result_state: string
  corpus_ref?: string | null
  status: string
  presentation_contract_version: number
  presentation_hash: string
  presentation_content_hash: string
  prepared_at: string
  artifacts_ready: boolean
  presentation_status: string
  preparation_detail: string
  presentation_active: boolean
  restore_available: boolean
  restore_reason: string
  staleness_reasons: string[]
  product_warnings: string[]
  links: AnalysisResultLinks
  artifact_families: ArtifactFamilySummary[]
}

export interface AnalysisResultPresentationResponse {
  job_id: string
  consumer_key: string
  manifest: AnalysisResultManifest
  presentation: PagePresentation | null
}

export interface DiscoverySummary {
  job_id: string
  result_id: string
  project_id?: string | null
  workflow_key: string
  mode: string
  status: string
  result_state: string
  presentation_status: string
  prepared_at: string
  completed_at: string
  restore_available: boolean
  restore_reason: string
  selected_source_thinker_id?: string | null
  selected_source_thinker_name?: string | null
  links: AnalysisResultLinks
}
