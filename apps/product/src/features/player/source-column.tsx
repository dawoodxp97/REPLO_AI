import type { SourceRef } from '@replo/contracts'
import { SourceView } from './source-view'

export interface ReferenceSourceProps {
  versionId: string
  refId: string | null
  references: Readonly<Record<string, SourceRef | undefined>>
  shareToken?: string
}

export function ReferenceSource({
  versionId,
  refId,
  references,
  shareToken,
}: ReferenceSourceProps) {
  if (refId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a reference in the lesson to read its source here.
      </p>
    )
  }

  const reference = references[refId]
  if (!reference) {
    return (
      <p className="text-sm text-muted-foreground">This reference is not part of the lesson.</p>
    )
  }

  return (
    <SourceView
      versionId={versionId}
      path={reference.path}
      range={{ start: reference.startLine, end: reference.endLine }}
      shareToken={shareToken}
      windowed
    />
  )
}
