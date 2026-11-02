import { cn } from '@replo/ui'
import type { Evidence } from '@replo/contracts'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { EvidenceChips } from './evidence-chips'
import type { SourceRefMap } from './source-ref-map'

export interface ClaimPreviewProps {
  kind: 'observed' | 'interpretation'
  evidence: readonly Evidence[]
  references: SourceRefMap
  onOpenReference: (refId: string) => void
  children: ReactNode
}

export function ClaimPreview({
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
