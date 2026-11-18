'use client'

import type { GraphNodeDto } from '@replo/contracts'
import { Badge, Button, Skeleton } from '@replo/ui'
import { useState } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { EvidenceChips } from '@/features/player/blocks/evidence-chips'
import { SourceView } from '@/features/player/source/source-view'
import type { SourceRefMap } from '@/features/player/source/source-refs'

export function NodeDetail({
  data,
  loading,
  failed,
  versionId,
  onSelectNode,
}: {
  data: GraphNodeDto | undefined
  loading: boolean
  failed: boolean
  versionId: string
  onSelectNode: (nodeId: string) => void
}) {
  if (loading) return <Skeleton aria-busy="true" className="h-64 w-full" />
  if (failed || !data) {
    return (
      <ErrorPanel
        title="This node is not available"
        description="It may belong to another snapshot. Choose another node."
      />
    )
  }
  return <NodeBody data={data} versionId={versionId} onSelectNode={onSelectNode} />
}

function NodeBody({
  data,
  versionId,
  onSelectNode,
}: {
  data: GraphNodeDto
  versionId: string
  onSelectNode: (nodeId: string) => void
}) {
  const [sourceRefId, setSourceRefId] = useState<string | null>(null)
  const references: SourceRefMap = data.refs
  const sourceRef = sourceRefId === null ? undefined : data.refs[sourceRefId]
  const incoming = data.edges.filter((edge) => edge.direction === 'incoming')
  const outgoing = data.edges.filter((edge) => edge.direction === 'outgoing')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{data.node.label}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{data.node.kind}</Badge>
          {data.node.layer ? <Badge variant="outline">{data.node.layer}</Badge> : null}
          {data.node.domain ? <Badge variant="outline">{data.node.domain}</Badge> : null}
        </div>
        {data.node.path ? (
          <p className="font-mono text-xs break-all text-muted-foreground">{data.node.path}</p>
        ) : null}
        {data.node.summary ? <p className="text-sm">{data.node.summary}</p> : null}
      </div>

      {Object.keys(references).length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Evidence</h3>
          <EvidenceChips
            refIds={Object.keys(references)}
            references={references}
            onOpenReference={setSourceRefId}
          />
        </section>
      ) : null}

      {sourceRef ? (
        <section aria-label="Node source" className="space-y-2">
          <SourceView
            versionId={versionId}
            path={sourceRef.path}
            range={{ start: sourceRef.startLine, end: sourceRef.endLine }}
            windowed
            scrollToHighlight
          />
        </section>
      ) : null}

      <EdgeSection title="Incoming" edges={incoming} onSelectNode={onSelectNode} />
      <EdgeSection title="Outgoing" edges={outgoing} onSelectNode={onSelectNode} />
    </div>
  )
}

function EdgeSection({
  title,
  edges,
  onSelectNode,
}: {
  title: string
  edges: GraphNodeDto['edges']
  onSelectNode: (nodeId: string) => void
}) {
  if (edges.length === 0) return null
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-1">
        {edges.map((edge) => (
          <li key={`${edge.direction}:${edge.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-auto max-w-full justify-start whitespace-normal py-1.5 text-left"
              onClick={() => onSelectNode(edge.direction === 'incoming' ? edge.from : edge.to)}
            >
              <span className="font-mono text-xs text-muted-foreground">{edge.kind}</span>
              <span className="min-w-0 truncate">{edge.label}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
