import type { Block } from '@replo/contracts'
import { SafeMarkdown } from '@/components/safe-markdown'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import { CalloutBlock } from './callout-block'
import { ClaimPreview } from './claim-preview'
import { CodeExcerpt } from './code-excerpt'
import { ExerciseBlock } from './exercise-block'
import type { SourceRefMap } from './source-ref-map'

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
