'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { describeFlowchart } from './mermaid-steps'
import { renderMermaid } from './render-mermaid'
import { useColorScheme } from './use-color-scheme'

type DiagramStatus = 'waiting' | 'rendering' | 'ready' | 'failed'

const DIAGRAM_STATUS_MESSAGE: Record<DiagramStatus, string> = {
  waiting: 'The diagram is drawn when it scrolls into view.',
  rendering: 'Drawing the diagram…',
  ready: '',
  failed: 'The diagram could not be drawn. The steps below describe it.',
}

interface DiagramRender {
  source: string
  status: DiagramStatus
}

export function ArchitectureDiagram({ mermaid, caption }: { mermaid: string; caption: string }) {
  const scheme = useColorScheme()
  const container = useRef<HTMLDivElement>(null)
  const [render, setRender] = useState<DiagramRender>({ source: mermaid, status: 'waiting' })
  const status = render.source === mermaid ? render.status : 'waiting'
  const diagramId = `diagram-${useId().replace(/:/g, '')}`
  const steps = describeFlowchart(mermaid)
  const message = DIAGRAM_STATUS_MESSAGE[status]

  useEffect(() => {
    const node = container.current
    if (!node) return
    let cancelled = false
    let dispose: (() => void) | null = null
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setRender({ source: mermaid, status: 'rendering' })
      renderMermaid(node, mermaid, diagramId, scheme, () => cancelled).then(
        (disposeDiagram) => {
          if (cancelled) {
            disposeDiagram()
            return
          }
          dispose = disposeDiagram
          setRender({ source: mermaid, status: 'ready' })
        },
        () => {
          if (!cancelled) setRender({ source: mermaid, status: 'failed' })
        },
      )
    })
    observer.observe(node)
    return () => {
      cancelled = true
      observer.disconnect()
      dispose?.()
    }
  }, [mermaid, diagramId, scheme])

  return (
    <figure className="space-y-3">
      <div
        ref={container}
        role="img"
        aria-label={caption}
        className="overflow-x-auto rounded-lg border bg-card p-4 shadow-xs [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      />
      {message ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
      <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>
      {steps.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/70">
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
