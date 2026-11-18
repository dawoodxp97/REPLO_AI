import { skipToken, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useWorkspaceGraph(versionId: string) {
  return useQuery(orpc.workspace.graph.queryOptions({ input: { versionId } }))
}

export function useWorkspaceNode(versionId: string, nodeId: string | null) {
  return useQuery(
    orpc.workspace.node.queryOptions({
      input: nodeId === null ? skipToken : { versionId, nodeId },
    }),
  )
}

export function useWorkspaceDiagram(versionId: string, diagramId: string | null) {
  return useQuery(
    orpc.workspace.diagram.queryOptions({
      input: diagramId === null ? skipToken : { versionId, diagramId },
    }),
  )
}

export function useWorkspaceTree(versionId: string, enabled: boolean) {
  return useQuery({
    ...orpc.workspace.tree.queryOptions({ input: { versionId } }),
    enabled,
  })
}
