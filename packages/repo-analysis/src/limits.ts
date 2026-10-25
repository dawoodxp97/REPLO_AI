import type { Inventory } from './inventory'

export interface RepoLimits {
  maxFiles: number
  maxBytes: number
}

export type LimitBreach = { metric: 'files' | 'bytes'; value: number; limit: number }

export function limitBreach(summary: Inventory, limits: RepoLimits): LimitBreach | undefined {
  if (summary.fileCount > limits.maxFiles)
    return { metric: 'files', value: summary.fileCount, limit: limits.maxFiles }
  if (summary.totalBytes > limits.maxBytes)
    return { metric: 'bytes', value: summary.totalBytes, limit: limits.maxBytes }
  return undefined
}
