import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { buildFileTree } from './file-tree'

export interface SourceFileRequest {
  versionId: string
  path: string
  shareToken?: string
}

export function useSourceFile({ versionId, path, shareToken }: SourceFileRequest) {
  return useQuery(orpc.tutorials.getSource.queryOptions({ input: { versionId, path, shareToken } }))
}

export function useSourceTree(versionId: string, shareToken: string | undefined) {
  return useQuery({
    ...orpc.tutorials.sourceTree.queryOptions({ input: { versionId, shareToken } }),
    select: (data) => buildFileTree(data.files),
  })
}
