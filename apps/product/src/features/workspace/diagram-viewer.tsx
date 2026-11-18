'use client'

import type { DiagramDto, DiagramSpec } from '@replo/contracts'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import { Sheet } from '@/components/sheet'
import { useMemo, useState } from 'react'
import { EvidenceChips } from '@/features/player/blocks/evidence-chips'
import { SourceView } from '@/features/player/source/source-view'
import { layoutDiagram } from './diagram-layout'
import { reachableIds } from './reach'

type Reach = 'none' | 'incoming' | 'outgoing'
type Zoom = 1 | 1.5 | 2

const REACH_LABELS: Record<Reach, string> = {
  none: 'All nodes',
  incoming: 'Upstream',
  outgoing: 'Downstream',
}

const ZOOM_LABELS: Record<Zoom, string> = { 1: '100%', 1.5: '150%', 2: '200%' }

export function DiagramViewer({ data }: { data: DiagramDto }) {
  const layout = useMemo(() => layoutDiagram(data.diagram), [data.diagram])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reach, setReach] = useState<Reach>('none')
  const [zoom, setZoom] = useState<Zoom>(1)
  const [sourceRefId, setSourceRefId] = useState<string | null>(null)

  const selected = data.diagram.nodes.find((node) => node.id === selectedId) ?? null
  const reachable =
    selected === null || reach === 'none'
      ? new Set<string>()
      : reachableIds(data.diagram.edges, selected.id, reach)
  const viewBox = viewBoxOf(layout.width, layout.height, selectedId, layout.nodes, zoom)
  const selectedRefs = selected?.refIds ?? []
  const edgeRefs = data.diagram.edges
    .filter((edge) => edge.from === selectedId || edge.to === selectedId)
    .flatMap((edge) => edge.refIds)
  const sourceRef = sourceRefId === null ? undefined : data.refs[sourceRefId]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.diagram.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{data.diagram.caption}</p>
        <div className="flex flex-wrap items-center gap-2">
          {([1, 1.5, 2] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={zoom === value ? 'default' : 'outline'}
              onClick={() => setZoom(value)}
            >
              {ZOOM_LABELS[value]}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setZoom(1)}>
            Fit
          </Button>
          {(['none', 'incoming', 'outgoing'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={reach === value ? 'default' : 'outline'}
              onClick={() => setReach(value)}
              disabled={selected === null && value !== 'none'}
            >
              {REACH_LABELS[value]}
            </Button>
          ))}
        </div>

        <figure className="space-y-2">
          <div
            className="w-full max-w-full overflow-auto rounded-lg border bg-card p-3 shadow-xs"
            role="region"
            aria-label="Diagram map"
            tabIndex={0}
          >
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={viewBox}
              role="img"
              aria-label={`${data.diagram.title}. ${data.diagram.caption}. Use the node list below to inspect it.`}
            >
              <defs>
                <marker
                  id="diagram-arrow"
                  viewBox="0 0 8 8"
                  refX={7}
                  refY={4}
                  markerWidth={6}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--muted-foreground)" />
                </marker>
              </defs>
              {layout.edges.map((edge) => {
                const highlighted =
                  selectedId !== null &&
                  (edge.from === selectedId ||
                    edge.to === selectedId ||
                    reachable.has(edge.from) ||
                    reachable.has(edge.to))
                return (
                  <g key={edge.id}>
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={highlighted ? 'var(--ring)' : 'var(--muted-foreground)'}
                      strokeWidth={highlighted ? 1.6 : 1}
                      opacity={selectedId === null || highlighted ? 1 : 0.35}
                      markerEnd="url(#diagram-arrow)"
                    />
                    {edge.label ? (
                      <text
                        x={edge.labelX}
                        y={edge.labelY - 4}
                        textAnchor="middle"
                        fontSize={10}
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {shorten(edge.label, 24)}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              {layout.nodes.map((node) => {
                const isSelected = node.id === selectedId
                const isReachable = reachable.has(node.id)
                const dimmed = selectedId !== null && !isSelected && !isReachable
                return (
                  <g key={node.id}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx={6}
                      fill={isSelected ? 'var(--accent)' : 'var(--muted)'}
                      stroke={isSelected ? 'var(--ring)' : 'var(--border)'}
                      strokeWidth={isSelected ? 1.6 : 1}
                      opacity={dimmed ? 0.4 : 1}
                    />
                    <text
                      x={node.x + 10}
                      y={node.y + node.height / 2 + 4}
                      fontSize={12}
                      fill="currentColor"
                      className="text-foreground"
                      opacity={dimmed ? 0.5 : 1}
                    >
                      {shorten(node.label, 22)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <figcaption className="text-xs text-muted-foreground">
            {data.diagram.type} diagram · {layout.nodes.length} nodes · {layout.edges.length} edges.
          </figcaption>
        </figure>

        <section aria-label="Diagram nodes" className="flex flex-wrap gap-1.5">
          {data.diagram.nodes.map((node) => (
            <Button
              key={node.id}
              size="sm"
              variant={node.id === selectedId ? 'default' : 'outline'}
              onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
            >
              {node.label}
            </Button>
          ))}
        </section>

        {selected ? (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{selected.label}</h3>
              <span className="font-mono text-xs text-muted-foreground">{selected.kind}</span>
            </div>
            {selectedRefs.length > 0 ? (
              <EvidenceChips
                refIds={selectedRefs}
                references={data.refs}
                onOpenReference={setSourceRefId}
              />
            ) : null}
            <Connections diagram={data.diagram} selectedId={selected.id} onSelect={setSelectedId} />
            {edgeRefs.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Edge evidence</p>
                <EvidenceChips
                  refIds={[...new Set(edgeRefs)]}
                  references={data.refs}
                  onOpenReference={setSourceRefId}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a node to focus it, follow upstream or downstream, and open its evidence.
          </p>
        )}
      </CardContent>

      <Sheet
        side="right"
        open={sourceRefId !== null}
        onOpenChange={(open) => {
          if (!open) setSourceRefId(null)
        }}
        title="Source"
        description="The code this diagram node cites."
      >
        {sourceRef ? (
          <SourceView
            versionId={data.versionId}
            path={sourceRef.path}
            range={{ start: sourceRef.startLine, end: sourceRef.endLine }}
            windowed
            scrollToHighlight
          />
        ) : null}
      </Sheet>
    </Card>
  )
}

function Connections({
  diagram,
  selectedId,
  onSelect,
}: {
  diagram: DiagramSpec
  selectedId: string
  onSelect: (nodeId: string) => void
}) {
  const connections = diagram.edges.filter(
    (edge) => edge.from === selectedId || edge.to === selectedId,
  )
  if (connections.length === 0) return null
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node.label]))

  return (
    <ul aria-label="Connections" className="flex flex-wrap gap-1.5">
      {connections.map((edge) => {
        const other = edge.from === selectedId ? edge.to : edge.from
        return (
          <li key={edge.id}>
            <Button size="sm" variant="outline" onClick={() => onSelect(other)}>
              {edge.from === selectedId ? '→' : '←'} {nodes.get(other) ?? other}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

function viewBoxOf(
  width: number,
  height: number,
  selectedId: string | null,
  nodes: ReturnType<typeof layoutDiagram>['nodes'],
  zoom: Zoom,
): string {
  if (zoom === 1) return `0 0 ${width} ${height}`
  const node = nodes.find((candidate) => candidate.id === selectedId)
  const centerX = node ? node.x + node.width / 2 : width / 2
  const centerY = node ? node.y + node.height / 2 : height / 2
  const viewWidth = width / zoom
  const viewHeight = height / zoom
  const x = clamp(centerX - viewWidth / 2, 0, width - viewWidth)
  const y = clamp(centerY - viewHeight / 2, 0, height - viewHeight)
  return `${x} ${y} ${viewWidth} ${viewHeight}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function shorten(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value
}
