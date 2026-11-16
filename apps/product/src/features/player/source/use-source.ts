import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { buildFileTree } from './file-tree'

export interface SourceFileRequest {
  versionId: string
  path: string
  shareToken?: string
}

export function useSourceFile({ versionId, path }: SourceFileRequest) {
  return useQuery(orpc.courses.getSource.queryOptions({ input: { versionId, path } }))
}

export function useSourceTree(versionId: string, _shareToken: string | undefined) {
  void _shareToken
  return useQuery({
    ...orpc.courses.sourceTree.queryOptions({ input: { versionId } }),
    select: (data) => buildFileTree(data.files),
  })
}
