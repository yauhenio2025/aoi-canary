import { afterEach, describe, expect, test, vi } from 'vitest'

import comparisonSourceProfileFixture from '../fixtures/transient-aoi-source-profile-comparison.json'
import directSectionsFixture from '../fixtures/transient-genealogy-direct-sections.json'
import sourceProfileFixture from '../fixtures/transient-aoi-source-profile-dossier.json'
import sourceSelectionFixture from '../fixtures/transient-aoi-source-selection.json'
import {
  collectRawJsonLeafKeys,
  composeFromIntent,
  composeFromSelection,
  composeFromSource,
  normalizeTransientPresentation,
  validateTransientProofSurface,
} from '../lib/transientClient'
import type {
  ComposeFromIntentApiResponse,
  DirectSectionsTransientProofFixture,
  SourceProfileTransientProofFixture,
  SourceSelectionTransientProofFixture,
} from '../lib/transientClient'

const SELECTION_FIXTURE = sourceSelectionFixture as SourceSelectionTransientProofFixture
const SOURCE_PROFILE_DOSSIER_FIXTURE = sourceProfileFixture as SourceProfileTransientProofFixture
const SOURCE_PROFILE_COMPARISON_FIXTURE =
  comparisonSourceProfileFixture as SourceProfileTransientProofFixture
const DIRECT_SECTIONS_FIXTURE = directSectionsFixture as DirectSectionsTransientProofFixture

function buildSelectionResponse(): ComposeFromIntentApiResponse {
  return {
    presentation: {
      workflow_key: SELECTION_FIXTURE.request.workflow_key,
      consumer_key: SELECTION_FIXTURE.request.consumer_key,
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

function buildSourceProfileResponse(): ComposeFromIntentApiResponse {
  return {
    presentation: {
      workflow_key: SOURCE_PROFILE_DOSSIER_FIXTURE.request.workflow_key,
      consumer_key: SOURCE_PROFILE_DOSSIER_FIXTURE.request.consumer_key,
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-source-v3',
      view_count: 3,
      views: [
        {
          view_key: 'compose_intent_parent_aoi_briefing',
          view_name: 'AOI Briefing',
          description: 'Tabbed AOI briefing navigation',
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

function buildSourceProfileComparisonResponse(): ComposeFromIntentApiResponse {
  return {
    presentation: {
      workflow_key: SOURCE_PROFILE_COMPARISON_FIXTURE.request.workflow_key,
      consumer_key: SOURCE_PROFILE_COMPARISON_FIXTURE.request.consumer_key,
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-source-v3',
      view_count: 4,
      views: [
        {
          view_key: 'compose_intent_parent_aoi_comparison',
          view_name: 'AOI Comparison',
          description: 'Tabbed AOI comparison navigation',
          renderer_type: 'tab',
          renderer_config: {
            tab_style: 'underline',
          },
          structured_data: {},
          children: [
            {
              view_key: 'compose_intent_01_aoi_engagement_mapping',
              view_name: 'Engagement Mapping',
              description: 'Engagement map',
              renderer_type: 'card_grid',
              renderer_config: { sections: [] },
              structured_data: { groups: [] },
              children: [],
            },
            {
              view_key: 'compose_intent_02_aoi_sin_findings',
              view_name: 'Sin Findings',
              description: 'Findings',
              renderer_type: 'accordion',
              renderer_config: { sections: [] },
              structured_data: { sections: [] },
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

function buildDirectSectionsResponse(): ComposeFromIntentApiResponse {
  return {
    presentation: {
      workflow_key: DIRECT_SECTIONS_FIXTURE.request.workflow_key,
      consumer_key: DIRECT_SECTIONS_FIXTURE.request.consumer_key,
      style_school: 'explanatory_narrative',
      resolver_version: 'compose-from-intent-v2',
      view_count: 1,
      views: [
        {
          view_key: 'compose_intent_01_genealogy_relationship_classification',
          view_name: 'Relationship Comparison Map',
          description: 'Grouped comparison map.',
          renderer_type: 'card_grid',
          renderer_config: { columns: 2, group_by: '_category' },
          structured_data: { influence_channels: [] },
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

describe('transientClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('builds compose-from-selection requests against the analyzer transient route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildSelectionResponse(),
    })
    vi.stubGlobal('fetch', fetchMock)

    await composeFromSelection({
      baseUrl: 'https://example.test',
      request: SELECTION_FIXTURE.request,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/presenter/compose-from-selection',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(SELECTION_FIXTURE.request),
      }),
    )
  })

  test('builds compose-from-source requests against the analyzer source-profile route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildSourceProfileResponse(),
    })
    vi.stubGlobal('fetch', fetchMock)

    await composeFromSource({
      baseUrl: 'https://example.test',
      request: SOURCE_PROFILE_DOSSIER_FIXTURE.request,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/presenter/compose-from-source',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(SOURCE_PROFILE_DOSSIER_FIXTURE.request),
      }),
    )
  })

  test('builds compose-from-intent requests against the analyzer direct-sections route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildDirectSectionsResponse(),
    })
    vi.stubGlobal('fetch', fetchMock)

    await composeFromIntent({
      baseUrl: 'https://example.test',
      request: DIRECT_SECTIONS_FIXTURE.request,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/presenter/compose-from-intent',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(DIRECT_SECTIONS_FIXTURE.request),
      }),
    )
  })

  test('normalizes source-selection transient presentation without semantic reconstruction', () => {
    const response = buildSelectionResponse()

    const page = normalizeTransientPresentation(SELECTION_FIXTURE, response)

    expect(page.job_id).toBe(`transient:${SELECTION_FIXTURE.planning_decision_id}`)
    expect(page.plan_id).toBe(SELECTION_FIXTURE.planning_decision_id)
    expect(page.thinker_name).toBe(SELECTION_FIXTURE.display.thinker_name)
    expect(page.strategy_summary).toBe(SELECTION_FIXTURE.display.strategy_summary)
    expect(page.view_count).toBe(response.presentation.view_count)
    expect(page.views[0].renderer_type).toBe('tab')
    expect(page.views[0].children[3].renderer_type).toBe('raw_json')
    expect(page.views[0].children[3].raw_prose).toBeNull()
    expect(page.views[0].children[3].reading_scaffold).toBeNull()
  })

  test('normalizes source-profile transient presentation with fixture-derived identity only', () => {
    const response = buildSourceProfileResponse()

    const page = normalizeTransientPresentation(SOURCE_PROFILE_DOSSIER_FIXTURE, response)

    expect(page.job_id).toBe('transient:job-744edf255ad5:dossier')
    expect(page.plan_id).toBe('job-744edf255ad5:dossier')
    expect(page.thinker_name).toBe(SOURCE_PROFILE_DOSSIER_FIXTURE.display.thinker_name)
    expect(page.strategy_summary).toBe(SOURCE_PROFILE_DOSSIER_FIXTURE.display.strategy_summary)
    expect(page.view_count).toBe(response.presentation.view_count)
    expect(page.views[0].renderer_type).toBe('tab')
    expect(page.views[0].children[1].renderer_type).toBe('raw_json')
    expect(page.views[0].children[1].raw_prose).toBeNull()
    expect(page.views[0].children[1].reading_scaffold).toBeNull()
  })

  test('normalizes source-profile comparison transient presentation with fixture-derived identity only', () => {
    const response = buildSourceProfileComparisonResponse()

    const page = normalizeTransientPresentation(SOURCE_PROFILE_COMPARISON_FIXTURE, response)

    expect(page.job_id).toBe('transient:job-744edf255ad5:comparison')
    expect(page.plan_id).toBe('job-744edf255ad5:comparison')
    expect(page.thinker_name).toBe(SOURCE_PROFILE_COMPARISON_FIXTURE.display.thinker_name)
    expect(page.strategy_summary).toBe(SOURCE_PROFILE_COMPARISON_FIXTURE.display.strategy_summary)
    expect(page.view_count).toBe(response.presentation.view_count)
    expect(page.views[0].renderer_type).toBe('tab')
    expect(page.views[0].children[2].renderer_type).toBe('raw_json')
    expect(page.views[0].children[2].raw_prose).toBeNull()
    expect(page.views[0].children[2].reading_scaffold).toBeNull()
  })

  test('normalizes direct-sections transient presentation with planning-decision identity only', () => {
    const response = buildDirectSectionsResponse()

    const page = normalizeTransientPresentation(DIRECT_SECTIONS_FIXTURE, response)

    expect(page.job_id).toBe(`transient:${DIRECT_SECTIONS_FIXTURE.planning_decision_id}`)
    expect(page.plan_id).toBe(DIRECT_SECTIONS_FIXTURE.planning_decision_id)
    expect(page.thinker_name).toBe(DIRECT_SECTIONS_FIXTURE.display.thinker_name)
    expect(page.strategy_summary).toBe(DIRECT_SECTIONS_FIXTURE.display.strategy_summary)
    expect(page.view_count).toBe(response.presentation.view_count)
    expect(page.views[0].renderer_type).toBe('card_grid')
    expect(page.views[0].raw_prose).toBeNull()
    expect(page.views[0].reading_scaffold).toBeNull()
  })

  test('validates the bounded proof surface mechanically for all transient proof cases', () => {
    const selectionPage = normalizeTransientPresentation(SELECTION_FIXTURE, buildSelectionResponse())
    expect(collectRawJsonLeafKeys(selectionPage.views)).toEqual(['compose_intent_04_aoi_thematic_report'])
    expect(validateTransientProofSurface(selectionPage, SELECTION_FIXTURE)).toBeNull()

    const sourceProfilePage = normalizeTransientPresentation(
      SOURCE_PROFILE_DOSSIER_FIXTURE,
      buildSourceProfileResponse(),
    )
    expect(collectRawJsonLeafKeys(sourceProfilePage.views)).toEqual(['compose_intent_02_aoi_thematic_report'])
    expect(validateTransientProofSurface(sourceProfilePage, SOURCE_PROFILE_DOSSIER_FIXTURE)).toBeNull()

    const comparisonPage = normalizeTransientPresentation(
      SOURCE_PROFILE_COMPARISON_FIXTURE,
      buildSourceProfileComparisonResponse(),
    )
    expect(collectRawJsonLeafKeys(comparisonPage.views)).toEqual(['compose_intent_03_aoi_thematic_report'])
    expect(validateTransientProofSurface(comparisonPage, SOURCE_PROFILE_COMPARISON_FIXTURE)).toBeNull()

    const directSectionsPage = normalizeTransientPresentation(
      DIRECT_SECTIONS_FIXTURE,
      buildDirectSectionsResponse(),
    )
    expect(collectRawJsonLeafKeys(directSectionsPage.views)).toEqual([])
    expect(validateTransientProofSurface(directSectionsPage, DIRECT_SECTIONS_FIXTURE)).toBeNull()

    const selectionResponse = buildSelectionResponse()
    const driftedPage = normalizeTransientPresentation(SELECTION_FIXTURE, {
      ...selectionResponse,
      presentation: {
        ...selectionResponse.presentation,
        views: [
          {
            ...selectionResponse.presentation.views[0],
            children: [
              ...(selectionResponse.presentation.views[0].children ?? []),
              {
                view_key: 'extra_raw_json_leaf',
                view_name: 'Extra',
                description: 'Extra raw json',
                renderer_type: 'raw_json',
                renderer_config: {},
                structured_data: { unexpected: true },
                children: [],
              },
            ],
          },
        ],
      },
    })

    expect(validateTransientProofSurface(driftedPage, SELECTION_FIXTURE)).toMatch(/at most one raw_json leaf/)

    const driftedDirectSectionsPage = normalizeTransientPresentation(DIRECT_SECTIONS_FIXTURE, {
      ...buildDirectSectionsResponse(),
      presentation: {
        ...buildDirectSectionsResponse().presentation,
        views: [
          {
            ...buildDirectSectionsResponse().presentation.views[0],
            renderer_type: 'tab',
          },
        ],
      },
    })

    expect(validateTransientProofSurface(driftedDirectSectionsPage, DIRECT_SECTIONS_FIXTURE)).toMatch(
      /requires root renderer card_grid/,
    )
  })
})
