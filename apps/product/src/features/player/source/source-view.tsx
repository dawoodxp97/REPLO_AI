'use client'

import { Button, Skeleton } from '@replo/ui'
import { useMemo, useState } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { CodeLines, type LineRange } from './code-lines'
import { lineWindow, shiftWindow, type LineWindow } from './line-window'
import { SourceFileHeader } from './source-file-header'
import { useHighlightedViewport } from './use-highlighted-lines'
import { useSourceFile } from './use-source'

export interface SourceViewProps {
  versionId: string
  path: string
  range: LineRange | null
  shareToken?: string
  windowed: boolean
  scrollToHighlight?: boolean
}

export function SourceView({
  versionId,
  path,
  range,
  shareToken,
  windowed,
  scrollToHighlight = false,
}: SourceViewProps) {
  const file = useSourceFile({ versionId, path, shareToken })

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
      key={`${path}:${range?.start ?? 0}-${range?.end ?? 0}`}
      path={path}
      content={file.data.content}
      permalink={file.data.permalink}
      commitSha={file.data.commitSha}
      range={range}
      windowed={windowed}
      scrollToHighlight={scrollToHighlight}
    />
  )
}

interface SourceFileProps {
  path: string
  content: string
  permalink: string
  commitSha: string
  range: LineRange | null
  windowed: boolean
  scrollToHighlight: boolean
}

function SourceFile({
  path,
  content,
  permalink,
  commitSha,
  range,
  windowed,
  scrollToHighlight,
}: SourceFileProps) {
  const allLines = useMemo(() => content.split('\n'), [content])
  const anchor = range?.start ?? 1
  const [manualWindow, setManualWindow] = useState<LineWindow | null>(null)
  const view = windowed
    ? (manualWindow ?? lineWindow(allLines.length, anchor - 1))
    : { from: 0, to: allLines.length }
  const visibleLines = useMemo(
    () => allLines.slice(view.from, view.to),
    [allLines, view.from, view.to],
  )
  const { viewportRef, tokens } = useHighlightedViewport(visibleLines, path)
  const openLines = range ? `#L${range.start}-L${range.end}` : ''

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <SourceFileHeader path={path} commitSha={commitSha} githubHref={`${permalink}${openLines}`} />
      {windowed && allLines.length > visibleLines.length ? (
        <WindowControls
          total={allLines.length}
          view={view}
          onMove={(direction) => setManualWindow(shiftWindow(view, allLines.length, direction))}
        />
      ) : null}
      <div ref={viewportRef}>
        <CodeLines
          label={`${path}${range ? `, lines ${range.start} to ${range.end}` : ''}`}
          lines={visibleLines}
          firstLine={view.from + 1}
          highlight={range}
          tokens={tokens}
          scrollToHighlight={scrollToHighlight}
        />
      </div>
    </div>
  )
}

interface WindowControlsProps {
  total: number
  view: LineWindow
  onMove: (direction: 'up' | 'down') => void
}

function WindowControls({ total, view, onMove }: WindowControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <Button variant="outline" size="xs" disabled={view.from === 0} onClick={() => onMove('up')}>
        Earlier lines
      </Button>
      <span className="font-mono tabular">
        Lines {view.from + 1}–{view.to} of {total}
      </span>
      <Button
        variant="outline"
        size="xs"
        disabled={view.to >= total}
        onClick={() => onMove('down')}
      >
        Later lines
      </Button>
    </div>
  )
}
