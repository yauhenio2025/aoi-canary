import type { ReactNode } from 'react'
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

  return (
    <div className="tab-shell">
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
            {child.view_name}
          </button>
        ))}
      </div>
      {activeView ? renderView(activeView) : null}
    </div>
  )
}
