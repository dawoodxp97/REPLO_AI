import type { Block, SourceRef } from '@replo/contracts'
import { cn, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { useIsVisible } from '@/hooks/use-is-visible'
import { SafeMarkdown } from '@/components/safe-markdown'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import { orpc } from '@/lib/orpc'
import { ClaimPreview, EvidenceChips } from './claim-preview'
import { CodeLines } from './code-lines'
import { languageForPath } from './source-language'
import { useHighlightedLines } from './use-highlighted-lines'

export interface LessonBlocksProps {
  versionId: string
  blocks: readonly Block[]
  references: Readonly<Record<string, SourceRef | undefined>>
  shareToken?: string
  onOpenReference: (refId: string) => void
}

export function LessonBlocks(props: LessonBlocksProps) {
  return (
    <div className="space-y-6">
      {props.blocks.map((block, index) => (
        <BlockView key={index} block={block} {...props} />
      ))}
    </div>
  )
}

function BlockView({ block, ...shared }: LessonBlocksProps & { block: Block }) {
  const { versionId, references, shareToken, onOpenReference } = shared
  switch (block.type) {
    case 'prose':
      return (
        <ClaimPreview
          kind={block.kind}
          evidence={block.evidence}
          references={references}
          onOpenReference={onOpenReference}
        >
          <SafeMarkdown source={block.md} />
        </ClaimPreview>
      )
    case 'code': {
      const reference = references[block.refId]
      if (!reference) return null
      return (
        <figure className="space-y-2">
          <CodeExcerpt
            versionId={versionId}
            reference={reference}
            shareToken={shareToken}
            highlight={block.highlight?.[0] ?? null}
          />
          <figcaption className="text-sm text-muted-foreground">{block.caption}</figcaption>
        </figure>
      )
    }
    case 'diagram':
      return <ArchitectureDiagram mermaid={block.mermaid} caption={block.caption} />
    case 'callout':
      return (
        <aside className={cn('rounded-md border-l-4 px-4 py-3', CALLOUT_TONE[block.tone])}>
          <p className="text-xs font-medium tracking-wide uppercase">{block.tone}</p>
          <SafeMarkdown source={block.md} />
        </aside>
      )
    case 'exercise':
      return (
        <section
          aria-label="Exercise"
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <p className="font-medium">Exercise</p>
          <p className="text-sm">{block.prompt}</p>
          {block.hints.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-primary underline underline-offset-4">
                Show a hint
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {block.hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <EvidenceChips
            refIds={block.solutionRefs}
            references={references}
            onOpenReference={onOpenReference}
          />
        </section>
      )
  }
}

const CALLOUT_TONE = {
  note: 'border-primary bg-primary/5',
  warning: 'border-interpretation bg-interpretation/10',
  tip: 'border-observed bg-observed/10',
} as const

function CodeExcerpt({
  versionId,
  reference,
  shareToken,
  highlight,
}: {
  versionId: string
  reference: SourceRef
  shareToken?: string
  highlight: [number, number] | null
}) {
  const file = useQuery(
    orpc.tutorials.getSource.queryOptions({
      input: { versionId, path: reference.path, shareToken },
    }),
  )
  const language = languageForPath(reference.path)
  const excerpt = file.data
    ? file.data.content.split('\n').slice(reference.startLine - 1, reference.endLine)
    : []
  const anchor = useRef<HTMLDivElement>(null)
  const visible = useIsVisible(anchor)
  const tokens = useHighlightedLines(excerpt.join('\n'), language, visible)

  if (file.isPending) return <Skeleton aria-busy="true" className="h-24 w-full" />
  if (file.isError) {
    return <p className="text-sm text-muted-foreground">This excerpt could not be loaded.</p>
  }

  return (
    <div ref={anchor}>
      <CodeLines
        label={`${reference.path}, lines ${reference.startLine} to ${reference.endLine}`}
        lines={excerpt}
        firstLine={reference.startLine}
        highlight={highlight ? { start: highlight[0], end: highlight[1] } : null}
        tokens={tokens}
      />
    </div>
  )
}
