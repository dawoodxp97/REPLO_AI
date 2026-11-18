'use client'

import type {
  CourseOverviewDto,
  DiagramSummary,
  GraphViewDto,
  SourceTreeEntryDto,
  Tour,
} from '@replo/contracts'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from '@replo/ui'
import { GitBranch, LayoutGrid, List, Table2 } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { Sheet } from '@/components/sheet'
import { SourceView } from '@/features/player/source/source-view'
import { formatRepoName, shortSha } from '@/lib/format'
import { createCourseLinks, type CourseRef, type CourseLinks } from '@/lib/course-paths'
import { DiagramViewer } from './diagram-viewer'
import { GraphView } from './graph-view'
import { NodeDetail } from './node-detail'
import { TableView } from './table-view'
import { TourList } from './tour-list'
import { TreeView } from './tree-view'
import {
  useWorkspaceDiagram,
  useWorkspaceGraph,
  useWorkspaceNode,
  useWorkspaceTree,
} from './use-workspace'
import { useWorkspaceLocation, type WorkspaceView } from './use-workspace-view'
import { filterGraph, filterSourceTree } from './workspace-filter'

const VIEWS: { value: WorkspaceView; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'graph', label: 'Graph', icon: LayoutGrid },
  { value: 'tree', label: 'Tree', icon: List },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'diagram', label: 'Diagram', icon: GitBranch },
]

export function WorkspacePage({
  course,
  overview,
  versionNo,
}: {
  course: CourseRef
  overview: CourseOverviewDto
  versionNo: number | undefined
}) {
  const links = createCourseLinks(course, { version: versionNo })
  const graph = useWorkspaceGraph(overview.versionId)
  const start = firstLesson(overview)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title={overview.course.title}
        description={
          <span className="font-mono text-xs">
            {formatRepoName(overview.course.owner, overview.course.repo)} · commit{' '}
            {shortSha(overview.commitSha)}
          </span>
        }
        action={
          <>
            <LinkButton href={links.overview()} variant="outline" size="sm">
              Course overview
            </LinkButton>
            {start ? (
              <LinkButton href={links.lesson(start)} size="sm">
                Start reading
              </LinkButton>
            ) : null}
          </>
        }
      />

      <QueryBoundary
        query={graph}
        errorTitle="The workspace could not be loaded"
        errorDescription="Check the link, or return to the course overview."
        loading={<Skeleton aria-busy="true" className="h-96 w-full" />}
      >
        {(data) => (
          <WorkspaceBody
            overview={overview}
            links={links}
            graphData={data}
            versionId={overview.versionId}
          />
        )}
      </QueryBoundary>
    </div>
  )
}

function WorkspaceBody({
  overview,
  links,
  graphData,
  versionId,
}: {
  overview: CourseOverviewDto
  links: CourseLinks
  graphData: GraphViewDto
  versionId: string
}) {
  const location = useWorkspaceLocation()
  const deferredQuery = useDeferredValue(location.query)
  const filteredGraph = useMemo(
    () => filterGraph(graphData.graph, deferredQuery),
    [graphData.graph, deferredQuery],
  )
  const tree = useWorkspaceTree(versionId, location.view === 'tree' || location.view === 'table')
  const filteredFiles = useMemo(
    () => filterSourceTree(tree.data?.files ?? [], deferredQuery),
    [tree.data, deferredQuery],
  )
  const diagramId = location.diagramId ?? graphData.diagrams[0]?.id ?? null
  const diagram = useWorkspaceDiagram(versionId, location.view === 'diagram' ? diagramId : null)
  const node = useWorkspaceNode(versionId, location.nodeId)
  const [sourcePath, setSourcePath] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <ToggleGroup
          aria-label="Workspace view"
          className="w-auto"
          value={[location.view]}
          onValueChange={([next]) => {
            const view = VIEWS.find((candidate) => candidate.value === next)?.value
            if (view) location.set({ view })
          }}
        >
          {VIEWS.map((view) => (
            <ToggleGroupItem key={view.value} value={view.value}>
              <view.icon aria-hidden />
              {view.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="relative w-full sm:ml-auto sm:w-72">
          <Input
            type="search"
            aria-label="Filter the workspace"
            placeholder="Filter nodes and files"
            value={location.query}
            onChange={(event) => location.set({ query: event.target.value })}
          />
        </div>
      </div>

      {location.view === 'graph' ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <GraphView
            graph={filteredGraph}
            selectedNodeId={location.nodeId}
            onSelectNode={(nodeId) => location.set({ nodeId })}
          />
          <WorkspaceRail
            tours={graphData.tours}
            diagrams={graphData.diagrams}
            overview={overview}
            links={links}
            onSelectNode={(nodeId) => location.set({ view: 'graph', nodeId })}
            onSelectDiagram={(next) => location.set({ view: 'diagram', diagramId: next })}
          />
        </div>
      ) : null}

      {location.view === 'tree' ? (
        <TreePanel
          tree={tree}
          files={filteredFiles}
          selectedPath={sourcePath}
          onSelectPath={setSourcePath}
        />
      ) : null}

      {location.view === 'table' ? (
        <TreePanel
          tree={tree}
          files={filteredFiles}
          selectedPath={sourcePath}
          onSelectPath={setSourcePath}
          table
        />
      ) : null}

      {location.view === 'diagram' ? (
        <div className="space-y-4">
          <DiagramPicker
            diagrams={graphData.diagrams}
            selectedId={diagramId}
            onSelect={(next) => location.set({ diagramId: next })}
          />
          {diagramId === null ? (
            <p className="text-sm text-muted-foreground">No diagrams for this snapshot.</p>
          ) : (
            <QueryBoundary
              query={diagram}
              errorTitle="The diagram could not be loaded"
              loading={<Skeleton aria-busy="true" className="h-72 w-full" />}
            >
              {(data) => <DiagramViewer data={data} />}
            </QueryBoundary>
          )}
        </div>
      ) : null}

      <Sheet
        side="right"
        open={location.nodeId !== null}
        onOpenChange={(open) => {
          if (!open) location.set({ nodeId: null })
        }}
        title="Node"
        description="Summary, evidence and edges for the selected node."
      >
        <NodeDetail
          data={node.data}
          loading={node.isPending}
          failed={node.isError}
          versionId={versionId}
          onSelectNode={(nodeId) => location.set({ nodeId })}
        />
      </Sheet>

      <Sheet
        side="right"
        open={sourcePath !== null}
        onOpenChange={(open) => {
          if (!open) setSourcePath(null)
        }}
        title="Source"
        description="The file at the pinned commit."
      >
        {sourcePath ? (
          <SourceView versionId={versionId} path={sourcePath} range={null} windowed />
        ) : null}
      </Sheet>
    </div>
  )
}

function TreePanel({
  tree,
  files,
  selectedPath,
  onSelectPath,
  table = false,
}: {
  tree: ReturnType<typeof useWorkspaceTree>
  files: readonly SourceTreeEntryDto[]
  selectedPath: string | null
  onSelectPath: (path: string) => void
  table?: boolean
}) {
  if (tree.isPending) return <Skeleton aria-busy="true" className="h-96 w-full" />
  if (tree.isError) {
    return (
      <ErrorPanel
        title="The file tree could not be loaded"
        description="Check the link, then try again."
      />
    )
  }
  return table ? (
    <TableView files={files} onSelectPath={onSelectPath} />
  ) : (
    <TreeView files={files} selectedPath={selectedPath} onSelectPath={onSelectPath} />
  )
}

function WorkspaceRail({
  tours,
  diagrams,
  overview,
  links,
  onSelectNode,
  onSelectDiagram,
}: {
  tours: readonly Tour[]
  diagrams: readonly DiagramSummary[]
  overview: CourseOverviewDto
  links: CourseLinks
  onSelectNode: (nodeId: string) => void
  onSelectDiagram: (diagramId: string) => void
}) {
  return (
    <aside aria-label="Workspace guides" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Guided tours</CardTitle>
        </CardHeader>
        <CardContent>
          <TourList tours={tours} overview={overview} links={links} onSelectNode={onSelectNode} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Diagrams</CardTitle>
        </CardHeader>
        <CardContent>
          {diagrams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No diagrams for this snapshot.</p>
          ) : (
            <ul className="space-y-1">
              {diagrams.map((diagram) => (
                <li key={diagram.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-start whitespace-normal py-1.5 text-left"
                    onClick={() => onSelectDiagram(diagram.id)}
                  >
                    <GitBranch aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate">{diagram.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {diagram.type}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}

function DiagramPicker({
  diagrams,
  selectedId,
  onSelect,
}: {
  diagrams: readonly DiagramSummary[]
  selectedId: string | null
  onSelect: (diagramId: string) => void
}) {
  if (diagrams.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {diagrams.map((diagram) => (
        <Button
          key={diagram.id}
          size="sm"
          variant={diagram.id === selectedId ? 'default' : 'outline'}
          onClick={() => onSelect(diagram.id)}
        >
          {diagram.title}
        </Button>
      ))}
    </div>
  )
}

function firstLesson(
  overview: CourseOverviewDto,
): { chapterKey: string; lessonKey: string } | null {
  for (const chapter of overview.outline) {
    const lesson = chapter.lessons[0]
    if (lesson) return { chapterKey: chapter.key, lessonKey: lesson.key }
  }
  return null
}
