import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export interface SourceFileRequest {
  versionId: string
  path: string
  shareToken?: string
}

export function useSourceFile({ versionId, path, shareToken }: SourceFileRequest) {
  return useQuery(orpc.tutorials.getSource.queryOptions({ input: { versionId, path, shareToken } }))
}
