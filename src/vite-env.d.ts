/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYZER_V2_URL?: string
  readonly VITE_AOI_JOB_ID?: string
  readonly VITE_AOI_MODE?: 'artifact' | 'live'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@the-syllabus/analysis-renderers/styles'
