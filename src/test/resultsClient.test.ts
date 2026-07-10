import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  assertEmbeddedManifestConsistency,
  discoverResults,
  getResultManifest,
  getResultPresentation,
  normalizeOptionalText,
} from '../lib/resultsClient'

describe('resultsClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('normalizes optional text by trimming and treating empty strings as unset', () => {
    expect(normalizeOptionalText(undefined)).toBeUndefined()
    expect(normalizeOptionalText('')).toBeUndefined()
    expect(normalizeOptionalText('   ')).toBeUndefined()
    expect(normalizeOptionalText('  project-123  ')).toBe('project-123')
  })

  test('builds discovery requests with analyzer-native query fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await discoverResults({
      baseUrl: 'https://example.test',
      project_id: 'project-123',
      workflow_key: 'anxiety_of_influence_thematic_single_thinker',
      consumer_key: 'aoi-canary',
      limit: 1,
      selected_source_thinker_id: 'neurath',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/results/discovery?project_id=project-123&workflow_key=anxiety_of_influence_thematic_single_thinker&consumer_key=aoi-canary&selected_source_thinker_id=neurath&limit=1',
    )
  })

  test('builds manifest and presentation requests against the result contract routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getResultManifest({
      baseUrl: 'https://example.test',
      job_id: 'job-123',
      consumer_key: 'aoi-canary',
    })
    await getResultPresentation({
      baseUrl: 'https://example.test',
      job_id: 'job-123',
      consumer_key: 'aoi-canary',
    })

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://example.test/v1/results/by-job/job-123?consumer_key=aoi-canary',
      'https://example.test/v1/results/by-job/job-123/presentation?consumer_key=aoi-canary',
    ])
  })

  test('throws in development when the embedded presentation manifest drifts on job or consumer', () => {
    expect(() =>
      assertEmbeddedManifestConsistency(
        { job_id: 'job-123', consumer_key: 'aoi-canary' } as never,
        { job_id: 'job-999', consumer_key: 'aoi-canary' } as never,
      ),
    ).toThrow(/Embedded manifest mismatch/)
  })
})
