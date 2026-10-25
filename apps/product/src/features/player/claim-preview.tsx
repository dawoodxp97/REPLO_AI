import type { Evidence, SourceRef } from '@replo/contracts'
import { Badge, cn } from '@replo/ui'
import type { ReactNode } from 'react'

export interface ClaimPreviewProps {
  kind: 'observed' | 'interpretation'
  evidence: readonly Evidence[]
  references: Readonly<Record<string, SourceRef | undefined>>
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
  return (
    <div
      className={cn(
        'prose-lesson',
        kind === 'interpretation' &&
          'rounded-r-md border-l-4 border-interpretation bg-interpretation/10 px-4 py-2',
      )}
    >
      {kind === 'interpretation' ? (
        <Badge variant="interpretation" className="mb-2">
          Interpretation — not confirmed by the code
        </Badge>
      ) : null}
      <div>{children}</div>
      <EvidenceChips
        refIds={evidence.map((item) => item.refId)}
        references={references}
        onOpenReference={onOpenReference}
      />
    </div>
  )
}

export function EvidenceChips({
  refIds,
  references,
  onOpenReference,
}: {
  refIds: readonly string[]
  references: Readonly<Record<string, SourceRef | undefined>>
  onOpenReference: (refId: string) => void
}) {
  const resolved = refIds.flatMap((refId) => {
    const reference = references[refId]
    return reference ? [{ refId, reference }] : []
  })
  if (resolved.length === 0) return null

  return (
    <p className="mt-2 flex flex-wrap gap-2">
      {resolved.map(({ refId, reference }) => {
        const label = `${reference.path}:L${reference.startLine}–${reference.endLine}`
        return (
          <button
            key={refId}
            type="button"
            onClick={() => onOpenReference(refId)}
            aria-label={`Open ${label} in the source panel`}
            className="inline-flex items-center gap-1.5 rounded-full border border-observed/30 bg-observed/10 px-2.5 py-0.5 font-mono text-xs whitespace-nowrap text-foreground transition-colors hover:bg-observed/20"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-observed" />
            {label}
          </button>
        )
      })}
    </p>
  )
}
