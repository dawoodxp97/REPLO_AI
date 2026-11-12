import type { SourceRef } from '@replo/contracts'
import { Skeleton } from '@replo/ui'
import { useMemo } from 'react'
import { CodeLines } from '../source/code-lines'
import { useHighlightedViewport } from '../source/use-highlighted-lines'
import { useSourceFile } from '../source/use-source'

const NO_LINES: readonly string[] = []

export interface CodeExcerptProps {
  versionId: string
  reference: SourceRef
  shareToken?: string
  highlight: readonly [number, number] | null
}

export function CodeExcerpt({ versionId, reference, shareToken, highlight }: CodeExcerptProps) {
  const file = useSourceFile({ versionId, path: reference.path, shareToken })
  const content = file.data?.content
  const { startLine, endLine } = reference
  const excerpt = useMemo(
    () => (content === undefined ? NO_LINES : content.split('\n').slice(startLine - 1, endLine)),
    [content, startLine, endLine],
  )
  const { viewportRef, tokens } = useHighlightedViewport(excerpt, reference.path)

  if (file.isPending) return <Skeleton aria-busy="true" className="h-24 w-full" />
  if (file.isError) {
    return <p className="text-sm text-muted-foreground">This excerpt could not be loaded.</p>
  }

  return (
    <div ref={viewportRef}>
      <CodeLines
        label={`${reference.path}, lines ${startLine} to ${endLine}`}
        lines={excerpt}
        firstLine={startLine}
        highlight={highlight ? { start: highlight[0], end: highlight[1] } : null}
        tokens={tokens}
      />
    </div>
  )
}
