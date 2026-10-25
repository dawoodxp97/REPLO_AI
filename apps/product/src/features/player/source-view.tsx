'use client'

import { Button, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useIsVisible } from '@/hooks/use-is-visible'
import { ErrorPanel } from '@/components/error-panel'
import { orpc } from '@/lib/orpc'
import { CodeLines, type LineRange } from './code-lines'
import { lineWindow, shiftWindow, type LineWindow } from './line-window'
import { languageForPath } from './source-language'
import { useHighlightedLines } from './use-highlighted-lines'

export interface SourceViewProps {
  versionId: string
  path: string
  range: LineRange | null
  shareToken?: string
  windowed: boolean
}

export function SourceView({ versionId, path, range, shareToken, windowed }: SourceViewProps) {
  const file = useQuery(
    orpc.tutorials.getSource.queryOptions({ input: { versionId, path, shareToken } }),
  )

  if (file.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />

  if (file.isError) {
    return (
      <ErrorPanel
        title="This file is not available"
        description="It may be larger than 1 MB, or it may not exist at the pinned commit."
      />
    )
  }

  return (
    <SourceFile
      path={path}
      content={file.data.content}
      permalink={file.data.permalink}
      range={range}
      windowed={windowed}
    />
  )
}

interface SourceFileProps {
  path: string
  content: string
  permalink: string
  range: LineRange | null
  windowed: boolean
}

function SourceFile({ path, content, permalink, range, windowed }: SourceFileProps) {
  const allLines = content.split('\n')
  const anchor = range?.start ?? 1
  const [manualWindow, setManualWindow] = useState<LineWindow | null>(null)
  const view = windowed
    ? (manualWindow ?? lineWindow(allLines.length, anchor - 1))
    : { from: 0, to: allLines.length }
  const visibleLines = allLines.slice(view.from, view.to)
  const language = languageForPath(path)
  const viewport = useRef<HTMLDivElement>(null)
  const visible = useIsVisible(viewport)
  const tokens = useHighlightedLines(visibleLines.join('\n'), language, visible)
  const openLines = range ? `#L${range.start}-L${range.end}` : ''

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb path={path} />
        <a
          href={`${permalink}${openLines}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-4"
        >
          Open on GitHub
        </a>
      </div>
      {windowed && allLines.length > visibleLines.length ? (
        <WindowControls
          total={allLines.length}
          view={view}
          onMove={(direction) => setManualWindow(shiftWindow(view, allLines.length, direction))}
        />
      ) : null}
      <div ref={viewport}>
        <CodeLines
          label={`${path}${range ? `, lines ${range.start} to ${range.end}` : ''}`}
          lines={visibleLines}
          firstLine={view.from + 1}
          highlight={range}
          tokens={tokens}
        />
      </div>
    </div>
  )
}

function Breadcrumb({ path }: { path: string }) {
  const segments = path.split('/')
  return (
    <nav
      aria-label="File path"
      className="min-w-0 break-all font-mono text-xs text-muted-foreground"
    >
      {segments.map((segment, index) => (
        <span key={`${index}-${segment}`}>
          {index > 0 ? ' / ' : ''}
          <span className={index === segments.length - 1 ? 'text-foreground' : undefined}>
            {segment}
          </span>
        </span>
      ))}
    </nav>
  )
}

function WindowControls({
  total,
  view,
  onMove,
}: {
  total: number
  view: LineWindow
  onMove: (direction: 'up' | 'down') => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <Button variant="outline" size="sm" disabled={view.from === 0} onClick={() => onMove('up')}>
        Earlier lines
      </Button>
      <span>
        Lines {view.from + 1}–{view.to} of {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={view.to >= total}
        onClick={() => onMove('down')}
      >
        Later lines
      </Button>
    </div>
  )
}
