import { afterEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import directSectionsFixture from '../fixtures/transient-genealogy-direct-sections.json'
import sourceProfileComparisonFixture from '../fixtures/transient-aoi-source-profile-comparison.json'
import rendererRelease from '../../vendor/renderer-release.json'
import sourceProfileFixture from '../fixtures/transient-aoi-source-profile-dossier.json'
import sourceSelectionFixture from '../fixtures/transient-aoi-source-selection.json'

function hasRendererVersion(content: string) {
  return content.includes(rendererRelease.renderer_package_version)
}

function buildDiscovery(jobId = 'job-live-123') {
  return [
    {
      job_id: jobId,
      result_id: `result-${jobId}`,
      project_id: 'project-aoi',
      workflow_key: 'anxiety_of_influence_thematic_single_thinker',
      mode: 'v2_presentation',
      status: 'completed',
      result_state: 'ready',
      presentation_status: 'completed',
      prepared_at: '2026-03-24T00:00:00Z',
      completed_at: '2026-03-24T00:00:00Z',
      restore_available: true,
      restore_reason: 'ready',
      selected_source_thinker_id: 'neurath',
      selected_source_thinker_name: 'Otto Neurath',
      links: {
        page_url: '',
        presentation_url: '',
        manifest_url: '',
        trace_url: '',
        refresh_presentation_url: '',
      },
    },
  ]
}

function buildResultManifest(overrides: Record<string, unknown> = {}) {
  return {
    job_id: 'job-live-123',
    plan_id: 'plan-live-123',
    workflow_key: 'anxiety_of_influence_thematic_single_thinker',
    consumer_key: 'aoi-canary',
    composition_mode: null,
    result_id: 'result-job-live-123',
    result_state: 'ready',
    corpus_ref: null,
    status: 'completed',
    presentation_contract_version: 1,
    presentation_hash: 'hash-123',
    presentation_content_hash: 'content-hash-123',
    prepared_at: '2026-03-24T00:00:00Z',
    artifacts_ready: true,
    presentation_status: 'completed',
    preparation_detail: 'ready',
    presentation_active: true,
    restore_available: true,
    restore_reason: 'ready',
    staleness_reasons: [],
    product_warnings: [],
    links: {
      page_url: '',
      presentation_url: '',
      manifest_url: '',
      trace_url: '',
      refresh_presentation_url: '',
    },
    artifact_families: [],
    ...overrides,
  }
}

function buildTransientSelectionComposeResponse() {
  return {
    presentation: {
      workflow_key: 'anxiety_of_influence_thematic_single_thinker',
      consumer_key: 'aoi-canary',
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-selection-v1',
      view_count: 5,
      views: [
        {
          view_key: 'compose_intent_parent_aoi_comparison',
          view_name: 'AOI Comparison',
          description: 'Tabbed AOI navigation',
          renderer_type: 'tab',
          renderer_config: {
            tab_style: 'underline',
          },
          structured_data: {},
          children: [
            {
              view_key: 'compose_intent_01_aoi_thematic_synthesis',
              view_name: 'Thematic Synthesis',
              description: 'Synthesis',
              renderer_type: 'accordion',
              renderer_config: { sections: [] },
              structured_data: { themes: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_02_aoi_sin_findings',
              view_name: 'Sin Findings',
              description: 'Findings',
              renderer_type: 'accordion',
              renderer_config: { sections: [] },
              structured_data: { findings: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_03_aoi_engagement_mapping',
              view_name: 'Engagement Mapping',
              description: 'Engagement',
              renderer_type: 'card_grid',
              renderer_config: { columns: 2 },
              structured_data: { rows: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_04_aoi_thematic_report',
              view_name: 'AOI Report',
              description: 'Closeout',
              renderer_type: 'raw_json',
              renderer_config: {},
              structured_data: { summary: 'closeout' },
              children: [],
            },
          ],
        },
      ],
    },
    generated_view_definitions: [],
    trace: {
      resolver_version: 'compose-from-selection-v1',
      entries: [],
    },
  }
}

function buildTransientSourceProfileComposeResponse() {
  return {
    presentation: {
      workflow_key: 'anxiety_of_influence_thematic_single_thinker',
      consumer_key: 'aoi-canary',
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-source-v3',
      view_count: 3,
      views: [
        {
          view_key: 'compose_intent_parent_aoi_briefing',
          view_name: 'AOI Briefing',
          description: 'Tabbed AOI briefing',
          renderer_type: 'tab',
          renderer_config: {
            tab_style: 'underline',
          },
          structured_data: {},
          children: [
            {
              view_key: 'compose_intent_01_aoi_thematic_synthesis',
              view_name: 'Thematic Synthesis',
              description: 'Synthesis',
              renderer_type: 'accordion',
              renderer_config: { sections: [] },
              structured_data: { themes: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_02_aoi_thematic_report',
              view_name: 'AOI Report',
              description: 'Closeout',
              renderer_type: 'raw_json',
              renderer_config: {},
              structured_data: { summary: 'closeout' },
              children: [],
            },
          ],
        },
      ],
    },
    generated_view_definitions: [],
    trace: {
      resolver_version: 'compose-from-source-v3',
      entries: [],
    },
  }
}

function buildTransientComparisonComposeResponse() {
  return {
    presentation: {
      workflow_key: 'anxiety_of_influence_thematic_single_thinker',
      consumer_key: 'aoi-canary',
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-source-v3',
      view_count: 4,
      views: [
        {
          view_key: 'compose_intent_parent_aoi_comparison',
          view_name: 'AOI Comparison',
          description: 'Tabbed AOI comparison',
          renderer_type: 'tab',
          renderer_config: {
            tab_style: 'underline',
          },
          structured_data: {},
          children: [
            {
              view_key: 'compose_intent_01_aoi_engagement_mapping',
              view_name: 'Engagement Mapping',
              description: 'Engagement',
              renderer_type: 'card_grid',
              renderer_config: { columns: 2 },
              structured_data: { rows: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_02_aoi_sin_findings',
              view_name: 'Sin Findings',
              description: 'Findings',
              renderer_type: 'accordion',
              renderer_config: { sections: [] },
              structured_data: { findings: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_03_aoi_thematic_report',
              view_name: 'AOI Report',
              description: 'Closeout',
              renderer_type: 'raw_json',
              renderer_config: {},
              structured_data: { summary: 'closeout' },
              children: [],
            },
          ],
        },
      ],
    },
    generated_view_definitions: [],
    trace: {
      resolver_version: 'compose-from-source-v3',
      entries: [],
    },
  }
}

function buildTransientDirectSectionsComposeResponse() {
  return {
    presentation: {
      workflow_key: 'intellectual_genealogy',
      consumer_key: 'aoi-canary',
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-intent-v2',
      view_count: 1,
      views: [
        {
          view_key: 'compose_intent_01_genealogy_relationship_classification',
          view_name: 'Relationship Comparison Map',
          description: 'Grouped genealogy comparison map',
          renderer_type: 'card_grid',
          renderer_config: {
            columns: 2,
            group_by: '_category',
          },
          structured_data: {
            influence_channels: [],
          },
          items: [],
          children: [],
        },
      ],
    },
    generated_view_definitions: [],
    trace: {
      resolver_version: 'compose-from-intent-v2',
      entries: [],
    },
  }
}

async function renderApp(options?: {
  env?: Record<string, string>
  search?: string
  fetchMock?: ReturnType<typeof vi.fn>
}) {
  vi.resetModules()
  vi.unstubAllEnvs()

  for (const [key, value] of Object.entries(options?.env ?? {})) {
    vi.stubEnv(key, value)
  }

  window.history.replaceState({}, '', options?.search ? `/?${options.search}` : '/')

  if (options?.fetchMock) {
    vi.stubGlobal('fetch', options.fetchMock)
  }

  const { default: App } = await import('../App')
  return render(<App />)
}

describe('AOI canary app', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    window.history.replaceState({}, '', '/')
  })

  test('renders the frozen Neurath AOI page in artifact mode', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { name: 'Benanav vs Otto Neurath' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Source Documents' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By Theme' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By Sin Type' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Full Report' })).toBeInTheDocument()
    expect(screen.getByText(hasRendererVersion)).toBeInTheDocument()
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('replays the pinned transient source-selection fixture through analyzer compose', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/compose-from-selection')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSelectionComposeResponse(),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      fetchMock,
    })

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    await userEvent.click(within(modeSwitcher).getByRole('button', { name: 'Transient' }))

    await waitFor(() => {
      expect(screen.getByText(/Transient proof loaded \(Source selection, bounded raw_json fallback\)/)).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Thematic Synthesis' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'AOI Report' })).toBeInTheDocument()
      expect(
        screen.getByText(
          (sourceSelectionFixture as { display: { strategy_summary: string } }).display.strategy_summary,
        ),
      ).toBeInTheDocument()
    })

    const composeCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/v1/presenter/compose-from-selection'),
    ) as [string | URL | Request, RequestInit | undefined] | undefined
    expect(composeCall).toBeDefined()
    expect(String(composeCall?.[0])).toContain('/v1/presenter/compose-from-selection')
    expect(JSON.parse(String(composeCall?.[1]?.body))).toEqual(
      (sourceSelectionFixture as { request: unknown }).request,
    )
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/v1/presenter/compose-from-source')),
    ).toBe(false)
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('can switch transient proof to the pinned source-profile dossier fixture', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/compose-from-selection')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSelectionComposeResponse(),
        })
      }

      if (url.includes('/v1/presenter/compose-from-source')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSourceProfileComposeResponse(),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      fetchMock,
    })

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    await userEvent.click(within(modeSwitcher).getByRole('button', { name: 'Transient' }))

    const proofSelector = await screen.findByRole('group', { name: 'Transient proof selector' })
    await userEvent.click(within(proofSelector).getByRole('button', { name: 'Source profile: dossier' }))

    await waitFor(() => {
      expect(
        screen.getByText(/Transient proof loaded \(Source profile: dossier, bounded raw_json fallback\)/),
      ).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Thematic Synthesis' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'AOI Report' })).toBeInTheDocument()
      expect(
        screen.getByText(
          (sourceProfileFixture as { display: { strategy_summary: string } }).display.strategy_summary,
        ),
      ).toBeInTheDocument()
    })

    const composeCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/v1/presenter/compose-from-source'),
    ) as [string | URL | Request, RequestInit | undefined] | undefined
    expect(composeCall).toBeDefined()
    expect(String(composeCall?.[0])).toContain('/v1/presenter/compose-from-source')
    expect(JSON.parse(String(composeCall?.[1]?.body))).toEqual(
      (sourceProfileFixture as { request: unknown }).request,
    )
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('can switch transient proof to the pinned source-profile comparison fixture', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/compose-from-selection')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSelectionComposeResponse(),
        })
      }

      if (url.includes('/v1/presenter/compose-from-source')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { profile?: string }
        return Promise.resolve({
          ok: true,
          json: async () =>
            body.profile === 'comparison'
              ? buildTransientComparisonComposeResponse()
              : buildTransientSourceProfileComposeResponse(),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      fetchMock,
    })

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    await userEvent.click(within(modeSwitcher).getByRole('button', { name: 'Transient' }))

    const proofSelector = await screen.findByRole('group', { name: 'Transient proof selector' })
    await userEvent.click(within(proofSelector).getByRole('button', { name: 'Source profile: comparison' }))

    await waitFor(() => {
      expect(
        screen.getByText(/Transient proof loaded \(Source profile: comparison, bounded raw_json fallback\)/),
      ).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Engagement Mapping' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'AOI Report' })).toBeInTheDocument()
      expect(
        screen.getByText(
          (sourceProfileComparisonFixture as { display: { strategy_summary: string } }).display.strategy_summary,
        ),
      ).toBeInTheDocument()
    })

    const composeCall = fetchMock.mock.calls.find((call) => {
      const url = String(call[0])
      if (!url.includes('/v1/presenter/compose-from-source')) {
        return false
      }
      const init = call[1] as RequestInit | undefined
      const body = JSON.parse(String(init?.body ?? '{}')) as { profile?: string }
      return body.profile === 'comparison'
    }) as [string | URL | Request, RequestInit | undefined] | undefined

    expect(composeCall).toBeDefined()
    expect(JSON.parse(String(composeCall?.[1]?.body))).toEqual(
      (sourceProfileComparisonFixture as { request: unknown }).request,
    )
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('can switch transient proof to the pinned genealogy direct-sections fixture', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/compose-from-selection')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSelectionComposeResponse(),
        })
      }

      if (url.includes('/v1/presenter/compose-from-source')) {
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientSourceProfileComposeResponse(),
        })
      }

      if (url.includes('/v1/presenter/compose-from-intent')) {
        expect(JSON.parse(String(init?.body ?? '{}'))).toEqual(
          (directSectionsFixture as { request: unknown }).request,
        )
        return Promise.resolve({
          ok: true,
          json: async () => buildTransientDirectSectionsComposeResponse(),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      fetchMock,
    })

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    await userEvent.click(within(modeSwitcher).getByRole('button', { name: 'Transient' }))

    const proofSelector = await screen.findByRole('group', { name: 'Transient proof selector' })
    await userEvent.click(within(proofSelector).getByRole('button', { name: 'Genealogy: direct sections' }))

    await waitFor(() => {
      expect(screen.getByText(/Transient proof loaded \(Genealogy: direct sections\)/)).toBeInTheDocument()
      expect(screen.getByText('Relationship Comparison Map')).toBeInTheDocument()
      expect(
        screen.getByText(
          (directSectionsFixture as { display: { strategy_summary: string } }).display.strategy_summary,
        ),
      ).toBeInTheDocument()
    })

    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/v1/presenter/compose-from-intent')),
    ).toBe(true)
    expect(screen.queryByText('Unexpected root renderer')).not.toBeInTheDocument()
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('shows an explicit transient error state when compose fails', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/compose-from-selection')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({}),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Transient' }))

    await waitFor(() => {
      expect(screen.getByText(/Transient proof error:/)).toBeInTheDocument()
      expect(screen.getByText('Transient compose proof failed')).toBeInTheDocument()
      expect(screen.getAllByText(/503 Service Unavailable/).length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('tab', { name: 'Thematic Synthesis' })).not.toBeInTheDocument()
  })

  test('uses result discovery, manifest, and presentation routes for the live proof path', async () => {
    const pageFixture = (await import('../fixtures/neurath-page.json')).default
    const manifest = buildResultManifest()
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/discovery?')) {
        return Promise.resolve({ ok: true, json: async () => buildDiscovery() })
      }

      if (url.includes('/v1/results/by-job/job-live-123?')) {
        return Promise.resolve({ ok: true, json: async () => manifest })
      }

      if (url.includes('/v1/results/by-job/job-live-123/presentation?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-live-123',
            consumer_key: 'aoi-canary',
            manifest,
            presentation: pageFixture,
          }),
        })
      }

      if (url.includes('/v1/presenter/trace/job-live-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
      }

      if (url.includes('/v1/presenter/status/job-live-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ artifacts_ready: true }) })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_PROJECT_ID: 'project-from-env' },
      fetchMock,
    })

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    await userEvent.click(within(modeSwitcher).getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeInTheDocument()
      expect(screen.getByText('Live result loaded')).toBeInTheDocument()
    })

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(calledUrls.some((url) => url.includes('/v1/results/discovery?'))).toBe(true)
    expect(calledUrls.some((url) => url.includes('/v1/results/by-job/job-live-123?'))).toBe(true)
    expect(calledUrls.some((url) => url.includes('/v1/results/by-job/job-live-123/presentation?'))).toBe(
      true,
    )
    expect(calledUrls.some((url) => url.includes('/v1/presenter/page/'))).toBe(false)
    expect(
      calledUrls.filter((url) => url.includes('consumer_key=aoi-canary')).length,
    ).toBeGreaterThan(0)
  })

  test('keeps trace/status failures non-blocking for the result-backed ready path', async () => {
    const pageFixture = (await import('../fixtures/neurath-page.json')).default
    const manifest = buildResultManifest()
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/discovery?')) {
        return Promise.resolve({ ok: true, json: async () => buildDiscovery() })
      }

      if (url.includes('/v1/results/by-job/job-live-123?')) {
        return Promise.resolve({ ok: true, json: async () => manifest })
      }

      if (url.includes('/v1/results/by-job/job-live-123/presentation?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-live-123',
            consumer_key: 'aoi-canary',
            manifest,
            presentation: pageFixture,
          }),
        })
      }

      if (url.includes('/v1/presenter/trace/job-live-123?')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/status/job-live-123?')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({}),
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_PROJECT_ID: 'project-from-env' },
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeInTheDocument()
      expect(screen.getByText('Live result loaded (status unavailable)')).toBeInTheDocument()
    })
  })

  test('prefers URL overrides over env defaults for discovery scope', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/discovery?')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: {
        VITE_AOI_PROJECT_ID: 'project-from-env',
        VITE_AOI_WORKFLOW_KEY: 'workflow-from-env',
      },
      search: 'project_id=project-from-url&workflow_key=workflow-from-url',
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText('No discoverable AOI result found')).toBeInTheDocument()
    })

    const discoveryUrl = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes('/v1/results/discovery?'))
    expect(discoveryUrl).toContain('project_id=project-from-url')
    expect(discoveryUrl).toContain('workflow_key=workflow-from-url')
  })

  test('shows config_missing when discovery mode is active and project_id is absent', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({ fetchMock })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText('Live discovery is not configured')).toBeInTheDocument()
      expect(screen.getByText(/needs a project/i)).toBeInTheDocument()
    })

    const resultCalls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/v1/results/'))
    expect(resultCalls).toHaveLength(0)
    expect(screen.queryByRole('tab', { name: 'Source Documents' })).not.toBeInTheDocument()
  })

  test('manual debug job bypasses discovery, does not require project_id, and stays manifest-first', async () => {
    const pageFixture = (await import('../fixtures/neurath-page.json')).default
    const manifest = buildResultManifest({
      job_id: 'job-manual-123',
      result_id: 'result-job-manual-123',
      plan_id: 'plan-manual-123',
    })
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/by-job/job-manual-123?')) {
        return Promise.resolve({ ok: true, json: async () => manifest })
      }

      if (url.includes('/v1/results/by-job/job-manual-123/presentation?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-manual-123',
            consumer_key: 'aoi-canary',
            manifest,
            presentation: pageFixture,
          }),
        })
      }

      if (url.includes('/v1/presenter/trace/job-manual-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
      }

      if (url.includes('/v1/presenter/status/job-manual-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ artifacts_ready: true }) })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_JOB_ID: 'job-manual-123' },
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText('Live result loaded')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeInTheDocument()
    })

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(calledUrls.some((url) => url.includes('/v1/results/discovery?'))).toBe(false)
    const resultCalls = calledUrls.filter((url) => url.includes('/v1/results/'))
    expect(resultCalls[0]).toContain('/v1/results/by-job/job-manual-123?consumer_key=aoi-canary')
    expect(resultCalls[1]).toContain(
      '/v1/results/by-job/job-manual-123/presentation?consumer_key=aoi-canary',
    )
  })

  test('clears the previous live page immediately when the debug job changes', async () => {
    const pageFixture = (await import('../fixtures/neurath-page.json')).default
    const firstManifest = buildResultManifest({
      job_id: 'job-manual-123',
      result_id: 'result-job-manual-123',
      plan_id: 'plan-manual-123',
    })
    const secondManifest = buildResultManifest({
      job_id: 'job-manual-456',
      result_id: 'result-job-manual-456',
      plan_id: 'plan-manual-456',
    })
    let resolveSecondManifest: (() => void) | undefined
    let resolveSecondPresentation: (() => void) | undefined

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/by-job/job-manual-123?')) {
        return Promise.resolve({ ok: true, json: async () => firstManifest })
      }

      if (url.includes('/v1/results/by-job/job-manual-123/presentation?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-manual-123',
            consumer_key: 'aoi-canary',
            manifest: firstManifest,
            presentation: pageFixture,
          }),
        })
      }

      if (url.includes('/v1/results/by-job/job-manual-456?')) {
        return new Promise((resolve) => {
          resolveSecondManifest = () =>
            resolve({
              ok: true,
              json: async () => secondManifest,
            })
        })
      }

      if (url.includes('/v1/results/by-job/job-manual-456/presentation?')) {
        return new Promise((resolve) => {
          resolveSecondPresentation = () =>
            resolve({
              ok: true,
              json: async () => ({
                job_id: 'job-manual-456',
                consumer_key: 'aoi-canary',
                manifest: secondManifest,
                presentation: {
                  ...pageFixture,
                  job_id: 'job-manual-456',
                  plan_id: 'plan-manual-456',
                },
              }),
            })
        })
      }

      if (url.includes('/v1/presenter/trace/')) {
        return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
      }

      if (url.includes('/v1/presenter/status/')) {
        return Promise.resolve({ ok: true, json: async () => ({ artifacts_ready: true }) })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_JOB_ID: 'job-manual-123' },
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText('Live result loaded')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'job-manual-456' } })

    expect(screen.getByText('Loading result manifest…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Source Documents' })).not.toBeInTheDocument()

    if (resolveSecondManifest) resolveSecondManifest()
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes('/v1/results/by-job/job-manual-456/presentation?'),
        ),
      ).toBe(true)
    })
    if (resolveSecondPresentation) resolveSecondPresentation()

    await waitFor(() => {
      expect(screen.getByText('Live result loaded')).toBeInTheDocument()
      expect(screen.getByText('job-manual-456')).toBeInTheDocument()
    })
  })

  test('shows manifest_unavailable without silently fetching presentation', async () => {
    const manifest = buildResultManifest({
      restore_available: false,
      restore_reason: 'not_prepared',
      result_state: 'pending',
      presentation_status: 'not_started',
    })
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/discovery?')) {
        return Promise.resolve({ ok: true, json: async () => buildDiscovery('job-pending-123') })
      }

      if (url.includes('/v1/results/by-job/job-pending-123?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...manifest,
            job_id: 'job-pending-123',
            result_id: 'result-job-pending-123',
          }),
        })
      }

      if (url.includes('/v1/presenter/trace/job-pending-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
      }

      if (url.includes('/v1/presenter/status/job-pending-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ artifacts_ready: false }) })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_PROJECT_ID: 'project-aoi' },
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText('Result manifest loaded (presentation unavailable)')).toBeInTheDocument()
      expect(screen.getByText(/restore_reason=not_prepared/i)).toBeInTheDocument()
    })

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(
      calledUrls.some((url) => url.includes('/v1/results/by-job/job-pending-123/presentation?')),
    ).toBe(false)
    expect(screen.queryByRole('tab', { name: 'Source Documents' })).not.toBeInTheDocument()
  })

  test('preserves manifest truth and error detail when presentation fetch fails', async () => {
    const manifest = buildResultManifest({
      job_id: 'job-fail-123',
      result_id: 'result-job-fail-123',
      restore_reason: 'ready',
      result_state: 'ready',
      staleness_reasons: ['stale-presentation'],
      product_warnings: ['warning-one'],
    })
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/v1/styles/tokens/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/results/discovery?')) {
        return Promise.resolve({ ok: true, json: async () => buildDiscovery('job-fail-123') })
      }

      if (url.includes('/v1/results/by-job/job-fail-123?')) {
        return Promise.resolve({ ok: true, json: async () => manifest })
      }

      if (url.includes('/v1/results/by-job/job-fail-123/presentation?')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({}),
        })
      }

      if (url.includes('/v1/presenter/trace/job-fail-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
      }

      if (url.includes('/v1/presenter/status/job-fail-123?')) {
        return Promise.resolve({ ok: true, json: async () => ({ artifacts_ready: true }) })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    await renderApp({
      env: { VITE_AOI_PROJECT_ID: 'project-aoi' },
      fetchMock,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Live' }))

    await waitFor(() => {
      expect(screen.getByText(/Result presentation error:/)).toBeInTheDocument()
      expect(screen.getAllByText(/500 Internal Server Error/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('ready').length).toBeGreaterThan(0)
    })

    expect(screen.getByText(/Manifest loaded successfully for job-fail-123/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show debug payloads/i }))
    expect(screen.getAllByText(/stale-presentation/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/warning-one/).length).toBeGreaterThan(0)
  })
})
