import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { buildFileTree } from './file-tree'

export interface SourceFileRequest {
  versionId: string
  path: string
}

export function useSourceFile({ versionId, path }: SourceFileRequest) {
  return useQuery(orpc.courses.getSource.queryOptions({ input: { versionId, path } }))
}

export function useSourceTree(versionId: string) {
  return useQuery({
    ...orpc.workspace.tree.queryOptions({ input: { versionId } }),
    select: (data) => buildFileTree(data.files),
  })
}
