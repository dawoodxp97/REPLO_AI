import type {
  DiagramDto,
  GraphNodeDto,
  GraphViewDto,
  SourceTreeDto,
} from '@replo/contracts'
import { upcastCourseContent } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import type { IndexingService } from '../indexing/indexing.service'
import { toSourceTree } from '../courses/source-tree'
import { coursesRepo } from '../courses/courses.repo'
import type { VersionAccess } from '../courses/version-access.service'
import { workspaceRepo } from './workspace.repo'

export interface WorkspaceDeps {
  db: Db
  courses: Pick<VersionAccess, 'readableVersion'>
  indexing: Pick<IndexingService, 'listFiles' | 'snapshotRef'>
}

export interface WorkspaceService {
  graph(userId: string, input: { versionId: string }): Promise<GraphViewDto>
  node(userId: string, input: { versionId: string; nodeId: string }): Promise<GraphNodeDto>
  diagram(userId: string, input: { versionId: string; diagramId: string }): Promise<DiagramDto>
  tree(userId: string, input: { versionId: string }): Promise<SourceTreeDto>
}

export function createWorkspaceService(deps: WorkspaceDeps): WorkspaceService {
  const { db, courses, indexing } = deps
  const repo = workspaceRepo(db)

  const loadVersion = async (userId: string, versionId: string) => {
    const version = await courses.readableVersion({ userId }, versionId)
    return { version, content: upcastCourseContent(version.content) }
  }

  return {
    async graph(userId, input) {
      const { version, content } = await loadVersion(userId, input.versionId)
      const layers = new Set<string>()
      const domains = new Set<string>()
      for (const node of content.graph.nodes) {
        if (node.layer) layers.add(node.layer)
        if (node.domain) domains.add(node.domain)
      }
      return {
        versionId: version.versionId,
        commitSha: content.meta.repo.commitSha,
        graph: content.graph,
        tours: content.tours,
        layers: [...layers].sort(),
        domains: [...domains].sort(),
      }
    },

    async node(userId, input) {
      const { version, content } = await loadVersion(userId, input.versionId)
      const node = content.graph.nodes.find((candidate) => candidate.id === input.nodeId)
      if (!node) notFound('Graph node')
      const edges = [
        ...content.graph.edges
          .filter((edge) => edge.from === input.nodeId)
          .map((edge) => edgeWithLabel(edge, edge.to, 'outgoing' as const)),
        ...content.graph.edges
          .filter((edge) => edge.to === input.nodeId)
          .map((edge) => edgeWithLabel(edge, edge.from, 'incoming' as const)),
      ]
      const refIds = new Set<string>()
      return {
        versionId: version.versionId,
        node,
        edges,
        refs: refsOf(content.sourceRefs, refIds),
      }
    },

    async diagram(userId, input) {
      const { version, content } = await loadVersion(userId, input.versionId)
      const stored = await repo.diagramsOf(version.versionId)
      const row = stored.find((candidate) => candidate.diagramId === input.diagramId)
      const diagram = content.diagrams.find((candidate) => candidate.id === input.diagramId)
      if (!diagram) notFound('Diagram')
      const refIds = new Set<string>()
      for (const node of diagram.nodes) for (const refId of node.refIds) refIds.add(refId)
      for (const edge of diagram.edges) for (const refId of edge.refIds) refIds.add(refId)
      return {
        versionId: version.versionId,
        diagram: row ? { ...row.spec, id: row.diagramId } : diagram,
        refs: refsOf(content.sourceRefs, refIds),
      }
    },

    async tree(userId, input) {
      const { version } = await loadVersion(userId, input.versionId)
      const [snapshot, files, repo2] = await Promise.all([
        indexing.snapshotRef(version.snapshotId),
        indexing.listFiles(version.snapshotId),
        coursesRepo(db).citedPathsOf(version.versionId),
      ])
      if (!snapshot) notFound('Course version')
      return {
        versionId: version.versionId,
        commitSha: snapshot.commitSha,
        files: toSourceTree(snapshot.commitSha, files, repo2).files,
      }
    },
  }
}

function edgeWithLabel(
  edge: { id: string; from: string; to: string; kind: string },
  other: string,
  direction: 'incoming' | 'outgoing',
) {
  return { id: edge.id, from: edge.from, to: edge.to, kind: edge.kind, direction, label: other }
}

function refsOf(
  sourceRefs: Record<string, { path: string; startLine: number; endLine: number; blobSha: string }>,
  refIds: ReadonlySet<string>,
) {
  return Object.fromEntries(Object.entries(sourceRefs).filter(([refId]) => refIds.has(refId)))
}