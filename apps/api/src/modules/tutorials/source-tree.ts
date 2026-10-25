import type { SourceTreeDto, SourceTreeEntry } from '@replo/contracts'
import { decideFile } from '../indexing/file-policy'
import type { SnapshotFile } from '../indexing/indexing.service'

export function toSourceTree(commitSha: string, files: readonly SnapshotFile[]): SourceTreeDto {
  return {
    commitSha,
    files: files.map(toEntry).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  }
}

function toEntry(file: SnapshotFile): SourceTreeEntry {
  return {
    path: file.path,
    sizeBytes: file.sizeBytes,
    language: file.language,
    role: file.role,
    readable: isReadable(file),
  }
}

function isReadable(file: SnapshotFile): boolean {
  const decision = decideFile(file.path, file.sizeBytes)
  return decision.kind === 'record' && decision.keepContent
}
