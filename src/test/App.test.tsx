import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../App'

describe('AOI canary app', () => {
  test('renders the frozen Neurath AOI page in artifact mode', async () => {
    const { container } = render(<App />)

    expect(screen.getByRole('heading', { name: 'Benanav vs Otto Neurath' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Source Documents' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By Theme' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By Sin Type' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Full Report' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Thematic Analysis' }).parentElement).toHaveClass(
      'tab-shell--underline',
    )

    await userEvent.click(screen.getByRole('tab', { name: 'By Sin Type' }))
    const groupBadges = Array.from(container.querySelectorAll('.ar-grid-group-badge')).map((node) =>
      node.textContent?.trim(),
    )
    expect(groupBadges).toContain('Strategic Silence')
    expect(groupBadges).toContain('Unacknowledged Debt')

    await userEvent.click(screen.getByRole('tab', { name: 'Full Report' }))
    expect(screen.getByText('Reading Implications')).toBeInTheDocument()
    expect(screen.getByText('Key Divergences')).toBeInTheDocument()
    expect(
      screen.getByText(/five themes and five interpretive sins compose into a coherent/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('fetches live presenter payloads with the aoi-canary consumer key', async () => {
    const pageFixture = (await import('../fixtures/neurath-page.json')).default
    const manifestFixture = (await import('../fixtures/neurath-manifest.json')).default
    const traceFixture = (await import('../fixtures/neurath-trace.json')).default

    let resolveManifest: (() => void) | undefined
    let resolveTrace: (() => void) | undefined
    let resolveStatus: (() => void) | undefined

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

      if (url.includes('/v1/presenter/page/')) {
        return Promise.resolve({
          ok: true,
          json: async () => pageFixture,
        })
      }

      if (url.includes('/v1/presenter/manifest/')) {
        return new Promise((resolve) => {
          resolveManifest = () =>
            resolve({
              ok: true,
              json: async () => manifestFixture,
            })
        })
      }

      if (url.includes('/v1/presenter/trace/')) {
        return new Promise((resolve) => {
          resolveTrace = () =>
            resolve({
              ok: true,
              json: async () => traceFixture,
            })
        })
      }

      if (url.includes('/v1/presenter/status/')) {
        return new Promise((resolve) => {
          resolveStatus = () =>
            resolve({
              ok: true,
              json: async () => ({ artifacts_ready: true }),
            })
        })
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    const liveButton = within(modeSwitcher).getByRole('button', { name: 'Live' })
    expect(liveButton).not.toBeDisabled()
    await userEvent.click(liveButton)

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
      const presenterUrls = calledUrls.filter((url) => url.includes('/v1/presenter/'))
      expect(presenterUrls.length).toBeGreaterThan(0)
      expect(presenterUrls.every((url) => url.includes('consumer_key=aoi-canary'))).toBe(true)
      expect(screen.getByRole('heading', { name: 'Source Documents' })).toBeInTheDocument()
    })
    expect(screen.getByText('Live page loaded')).toBeInTheDocument()

    if (resolveManifest) resolveManifest()
    if (resolveTrace) resolveTrace()
    if (resolveStatus) resolveStatus()

    await waitFor(() => {
      expect(screen.getByText('Live page loaded')).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })
})
