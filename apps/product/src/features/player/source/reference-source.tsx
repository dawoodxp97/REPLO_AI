import { FileCode } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@replo/ui'
import type { SourceRefMap } from './source-refs'
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
      <NoSourceShown
        className="min-h-64"
        title="No source selected"
        description="Choose a reference in the lesson to read its source here."
      />
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

export function NoSourceShown({
  title,
  description,
  className,
}: {
  title: string
  description: string
  className?: string
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia>
          <FileCode />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
