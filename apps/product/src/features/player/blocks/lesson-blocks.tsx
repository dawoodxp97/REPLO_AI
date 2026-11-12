import type { Block, Evidence } from '@replo/contracts'
import { Alert, AlertDescription, AlertTitle, cn } from '@replo/ui'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { SafeMarkdown } from '@/components/safe-markdown'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import type { SourceRefMap } from '../source/source-refs'
import { CodeExcerpt } from './code-excerpt'
import { EvidenceChips } from './evidence-chips'
import { ExerciseBlock } from './exercise-block'

export interface LessonBlocksProps {
  versionId: string
  blocks: readonly Block[]
  references: SourceRefMap
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
      return <CalloutBlock tone={block.tone} md={block.md} />
    case 'exercise':
      return (
        <ExerciseBlock
          prompt={block.prompt}
          hints={block.hints}
          solutionRefs={block.solutionRefs}
          references={references}
          onOpenReference={onOpenReference}
        />
      )
  }
}

interface ClaimPreviewProps {
  kind: 'observed' | 'interpretation'
  evidence: readonly Evidence[]
  references: SourceRefMap
  onOpenReference: (refId: string) => void
  children: ReactNode
}

function ClaimPreview({
  kind,
  evidence,
  references,
  onOpenReference,
  children,
}: ClaimPreviewProps) {
  const interpretation = kind === 'interpretation'

  return (
    <div className={cn('space-y-3', interpretation && 'border-l-2 border-interpretation pl-4')}>
      {interpretation ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-interpretation-text">
          <TriangleAlert className="size-3.5" />
          Interpretation — not confirmed by the code
        </p>
      ) : null}
      <div className="prose-lesson">{children}</div>
      <EvidenceChips
        refIds={evidence.map((item) => item.refId)}
        references={references}
        onOpenReference={onOpenReference}
      />
    </div>
  )
}

const CALLOUTS = {
  note: { title: 'Note', variant: 'default', Icon: Info },
  warning: { title: 'Warning', variant: 'interpretation', Icon: TriangleAlert },
  tip: { title: 'Tip', variant: 'default', Icon: Lightbulb },
} as const

function CalloutBlock({ tone, md }: { tone: keyof typeof CALLOUTS; md: string }) {
  const { title, variant, Icon } = CALLOUTS[tone]
  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-foreground">
        <SafeMarkdown source={md} />
      </AlertDescription>
    </Alert>
  )
}
