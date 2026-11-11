import { use } from 'react'
import { cn } from '@replo/ui'
import { ShownReferenceContext } from './shown-reference-context'
import type { SourceRefMap } from './source-ref-map'
import { formatSourceRef } from './source-ref-label'

export interface EvidenceChipsProps {
  refIds: readonly string[]
  references: SourceRefMap
  onOpenReference: (refId: string) => void
}

export function EvidenceChips({ refIds, references, onOpenReference }: EvidenceChipsProps) {
  const shownRefId = use(ShownReferenceContext)
  const resolved = refIds.flatMap((refId) => {
    const reference = references[refId]
    return reference ? [{ refId, label: formatSourceRef(reference) }] : []
  })
  if (resolved.length === 0) return null

  return (
    <ul aria-label="Evidence" className="flex flex-wrap gap-1.5">
      {resolved.map(({ refId, label }) => (
        <li key={refId} className="min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => onOpenReference(refId)}
            aria-label={`Open ${label} in the source panel`}
            aria-current={refId === shownRefId ? 'true' : undefined}
            className={cn(
              'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2 py-1 font-mono text-xs text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none pointer-coarse:min-h-10',
              refId === shownRefId && 'border-observed/60 bg-accent',
            )}
          >
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-observed" />
            <span className="truncate">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
