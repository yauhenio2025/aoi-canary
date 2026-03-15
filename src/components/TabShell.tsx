import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'

import type { ViewPayload } from '../types/presentation'

interface TabShellProps {
  view: ViewPayload
  renderView: (view: ViewPayload) => ReactNode
}

export function TabShell({ view, renderView }: TabShellProps) {
  const firstChild = view.children[0]?.view_key ?? ''
  const [selectedViewKey, setSelectedViewKey] = useState(firstChild)
  const activeViewKey = view.children.some((child) => child.view_key === selectedViewKey)
    ? selectedViewKey
    : firstChild

  const activeView = view.children.find((child) => child.view_key === activeViewKey) ?? view.children[0]
  const config = view.renderer_config ?? {}
  const tabLabels = asStringMap(config.tab_labels)
  const sectionDescriptions = asStringMap(config._section_descriptions)
  const tabStyle = typeof config.tab_style === 'string' ? config.tab_style : ''
  const styleOverrides = asRecord(config._style_overrides)
  const accentColor =
    typeof styleOverrides?.accent_color === 'string' ? styleOverrides.accent_color : '#7f1d1d'
  const shellStyle = {
    '--tab-accent-color': accentColor,
  } as CSSProperties
  const activeLabel = activeView ? tabLabels[activeView.view_key] ?? activeView.view_name : ''
  const activeDescription = activeView
    ? sectionDescriptions[activeView.view_key] ?? activeView.description
    : ''
  const activeDisplayView =
    activeView && (activeLabel !== activeView.view_name || activeDescription !== activeView.description)
      ? {
          ...activeView,
          view_name: activeLabel,
          description: activeDescription,
        }
      : activeView

  return (
    <div
      className={`tab-shell ${tabStyle === 'underline' ? 'tab-shell--underline' : ''}`}
      style={shellStyle}
    >
      <div className="tab-list" role="tablist" aria-label={view.view_name}>
        {view.children.map((child) => (
          <button
            key={child.view_key}
            type="button"
            role="tab"
            aria-selected={activeView?.view_key === child.view_key}
            className={`tab-button ${activeView?.view_key === child.view_key ? 'active' : ''}`}
            onClick={() => setSelectedViewKey(child.view_key)}
          >
            {tabLabels[child.view_key] ?? child.view_name}
          </button>
        ))}
      </div>
      {activeDisplayView ? renderView(activeDisplayView) : null}
    </div>
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asStringMap(value: unknown): Record<string, string> {
  const record = asRecord(value)
  if (!record) return {}
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}
