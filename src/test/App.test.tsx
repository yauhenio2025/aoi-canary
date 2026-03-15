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
    expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'By Sin Type' }))
    const groupBadges = Array.from(container.querySelectorAll('.ar-grid-group-badge')).map((node) =>
      node.textContent?.trim(),
    )
    expect(groupBadges).toContain('Strategic Silence')
    expect(groupBadges).toContain('Unacknowledged Debt')

    await userEvent.click(screen.getByRole('tab', { name: 'Report' }))
    expect(screen.getByText('Reading Implications')).toBeInTheDocument()
    expect(screen.getByText('Key Divergences')).toBeInTheDocument()
    expect(screen.queryByText('Unsupported renderer in canary')).not.toBeInTheDocument()
  })

  test('fetches live presenter payloads with the aoi-canary consumer key', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifacts_ready: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => (await import('../fixtures/neurath-page.json')).default,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => (await import('../fixtures/neurath-manifest.json')).default,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => (await import('../fixtures/neurath-trace.json')).default,
      })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    const modeSwitcher = screen.getByRole('group', { name: 'Mode switcher' })
    const liveButton = within(modeSwitcher).getByRole('button', { name: 'Live' })
    expect(liveButton).not.toBeDisabled()
    await userEvent.click(liveButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(calledUrls.every((url) => url.includes('consumer_key=aoi-canary'))).toBe(true)
    expect(screen.getByText('Live presenter artifacts loaded')).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
