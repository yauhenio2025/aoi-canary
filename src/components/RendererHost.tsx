import {
  AccordionRenderer,
  CardGridRenderer,
  RawJsonRenderer,
  ViewShell,
} from '@the-syllabus/analysis-renderers'

import type { ViewPayload } from '../types/presentation'

const RENDERER_MAP = {
  accordion: AccordionRenderer,
  card_grid: CardGridRenderer,
  raw_json: RawJsonRenderer,
} as const

function dataForView(view: ViewPayload): unknown {
  if (view.structured_data !== null && view.structured_data !== undefined) {
    return view.structured_data
  }
  if (view.items !== null && view.items !== undefined) {
    return view.items
  }
  return view.raw_prose
}

export function RendererHost({ view }: { view: ViewPayload }) {
  const Renderer = RENDERER_MAP[view.renderer_type as keyof typeof RENDERER_MAP]

  if (!Renderer) {
    return (
      <article className="unsupported-card">
        <h3>Unsupported renderer in canary</h3>
        <p>
          View <code>{view.view_key}</code> requested <code>{view.renderer_type}</code>.
        </p>
      </article>
    )
  }

  return (
    <article>
      <div className="tab-panel-header">
        <h2>{view.view_name}</h2>
        <p>{view.description}</p>
      </div>
      <ViewShell
        rendererType={view.renderer_type}
        scaffold={view.reading_scaffold ?? null}
      >
        {() => (
          <Renderer
            data={dataForView(view)}
            config={view.renderer_config ?? {}}
          />
        )}
      </ViewShell>
    </article>
  )
}
