import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export const WORKSPACE_VIEWS = ['graph', 'tree', 'table', 'diagram'] as const
export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number]

export interface WorkspaceLocation {
  view: WorkspaceView
  query: string
  nodeId: string | null
  diagramId: string | null
  set: (patch: Partial<Pick<WorkspaceLocation, 'view' | 'query' | 'nodeId' | 'diagramId'>>) => void
}

export function useWorkspaceLocation(): WorkspaceLocation {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const view = WORKSPACE_VIEWS.find((candidate) => candidate === params.get('view')) ?? 'graph'
  const query = params.get('q') ?? ''
  const nodeId = params.get('node')
  const diagramId = params.get('diagram')

  const set = useCallback(
    (patch: Partial<Pick<WorkspaceLocation, 'view' | 'query' | 'nodeId' | 'diagramId'>>) => {
      const next = new URLSearchParams(params.toString())
      if (patch.view !== undefined) {
        if (patch.view === 'graph') next.delete('view')
        else next.set('view', patch.view)
      }
      if (patch.query !== undefined) {
        if (patch.query === '') next.delete('q')
        else next.set('q', patch.query)
      }
      if (patch.nodeId !== undefined) {
        if (patch.nodeId === null) next.delete('node')
        else next.set('node', patch.nodeId)
      }
      if (patch.diagramId !== undefined) {
        if (patch.diagramId === null) next.delete('diagram')
        else next.set('diagram', patch.diagramId)
      }
      const search = next.toString()
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { view, query, nodeId, diagramId, set }
}
