import { FileCode } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@replo/ui'
import type { SourceRefMap } from './source-ref-map'
import { SourceView } from './source-view'

export interface ReferenceSourceProps {
  versionId: string
  refId: string | null
  references: SourceRefMap
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
      <Empty className="min-h-64">
        <EmptyHeader>
          <EmptyMedia>
            <FileCode />
          </EmptyMedia>
          <EmptyTitle>No source selected</EmptyTitle>
          <EmptyDescription>
            Choose a reference in the lesson to read its source here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
      scrollToHighlight
    />
  )
}
