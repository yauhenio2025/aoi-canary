export interface ViewPayload {
  view_key: string
  view_name: string
  description: string
  renderer_type: string
  renderer_config: Record<string, unknown>
  structured_data: unknown
  raw_prose: string | null
  items: Array<Record<string, unknown>> | null
  reading_scaffold?: Record<string, unknown> | null
  children: ViewPayload[]
}

export interface PagePresentation {
  job_id: string
  plan_id: string
  thinker_name: string
  strategy_summary: string
  views: ViewPayload[]
  view_count: number
}

export interface ManifestLike {
  views?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface TraceLike {
  entries?: Array<Record<string, unknown>>
  [key: string]: unknown
}
