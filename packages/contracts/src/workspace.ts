import { oc } from '@orpc/contract'
import { z } from 'zod'
import { CommitSha } from './common'
import { CourseGraph, DiagramSpec, GraphNode, SourceRef, Tour } from './course/content'

export const DiagramSummary = DiagramSpec.pick({
  id: true,
  type: true,
  title: true,
  caption: true,
})
export type DiagramSummary = z.infer<typeof DiagramSummary>

export const GraphViewDto = z.object({
  versionId: z.uuid(),
  commitSha: CommitSha,
  graph: CourseGraph,
  tours: z.array(Tour),
  diagrams: z.array(DiagramSummary),
  layers: z.array(z.string()),
  domains: z.array(z.string()),
})
export type GraphViewDto = z.infer<typeof GraphViewDto>

export const GraphNodeDto = z.object({
  versionId: z.uuid(),
  node: GraphNode,
  edges: z.array(
    z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
      kind: z.string(),
      direction: z.enum(['incoming', 'outgoing']),
      label: z.string(),
    }),
  ),
  refs: z.record(z.string(), SourceRef),
})
export type GraphNodeDto = z.infer<typeof GraphNodeDto>

export const DiagramDto = z.object({
  versionId: z.uuid(),
  diagram: DiagramSpec,
  refs: z.record(z.string(), SourceRef),
})
export type DiagramDto = z.infer<typeof DiagramDto>

export const SourceTreeEntryDto = z.object({
  path: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  language: z.string().nullable(),
  role: z.enum(['source', 'test', 'config', 'doc', 'generated', 'asset']),
  readable: z.boolean(),
  cited: z.boolean(),
})
export type SourceTreeEntryDto = z.infer<typeof SourceTreeEntryDto>

export const SourceTreeDto = z.object({
  versionId: z.uuid(),
  commitSha: CommitSha,
  files: z.array(SourceTreeEntryDto),
})
export type SourceTreeDto = z.infer<typeof SourceTreeDto>

export const workspaceContract = {
  graph: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/workspace/graph' })
    .input(z.object({ versionId: z.uuid() }))
    .output(GraphViewDto),
  node: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/workspace/nodes/{nodeId}' })
    .input(z.object({ versionId: z.uuid(), nodeId: z.string().min(1) }))
    .output(GraphNodeDto),
  diagram: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/workspace/diagrams/{diagramId}' })
    .input(z.object({ versionId: z.uuid(), diagramId: z.string().min(1) }))
    .output(DiagramDto)
    .errors({ DIAGRAM_NOT_FOUND: {} }),
  tree: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/workspace/tree' })
    .input(z.object({ versionId: z.uuid() }))
    .output(SourceTreeDto),
}

export type WorkspaceContract = typeof workspaceContract
