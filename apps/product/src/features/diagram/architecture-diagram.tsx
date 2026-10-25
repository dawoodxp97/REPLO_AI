'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { describeFlowchart } from './mermaid-steps'
import { renderMermaid } from './render-mermaid'

type RenderState = 'waiting' | 'rendering' | 'ready' | 'failed'

const STATE_MESSAGE: Record<RenderState, string> = {
  waiting: 'The diagram is drawn when it scrolls into view.',
  rendering: 'Drawing the diagram…',
  ready: '',
  failed: 'The diagram could not be drawn. The steps below describe it.',
}

export function ArchitectureDiagram({ mermaid, caption }: { mermaid: string; caption: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RenderState>('waiting')
  const diagramId = `diagram-${useId().replace(/:/g, '')}`
  const steps = describeFlowchart(mermaid)

  useEffect(() => {
    const node = container.current
    if (!node) return
    let active = true
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setState('rendering')
      renderMermaid(node, mermaid, diagramId).then(
        () => {
          if (active) setState('ready')
        },
        () => {
          if (active) setState('failed')
        },
      )
    })
    observer.observe(node)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [mermaid, diagramId])

  return (
    <figure className="space-y-3">
      <div
        ref={container}
        role="img"
        aria-label={caption}
        className="overflow-x-auto rounded-lg border border-border bg-card p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      />
      {STATE_MESSAGE[state] ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {STATE_MESSAGE[state]}
        </p>
      ) : null}
      <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>
      {steps.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {steps.map((step, index) => (
            <li key={index}>
              {step.from} → {step.to}
              {step.label ? `: ${step.label}` : ''}
            </li>
          ))}
        </ol>
      ) : null}
    </figure>
  )
}
