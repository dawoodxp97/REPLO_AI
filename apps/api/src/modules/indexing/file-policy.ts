import {
  classifyRole,
  detectLanguage,
  isExcludedPath,
  MAX_INDEXED_FILE_BYTES,
  type FileRole,
  type Language,
} from '@replo/repo-analysis'

type FileDecision =
  { kind: 'skip' } | { kind: 'record'; language: Language; role: FileRole; keepContent: boolean }

export function decideFile(path: string, size: number): FileDecision {
  if (isExcludedPath(path)) return { kind: 'skip' }
  const language = detectLanguage(path)
  const role = classifyRole(path, language)
  const keepContent = (role !== 'asset' || language === 'html') && size <= MAX_INDEXED_FILE_BYTES
  return { kind: 'record', language, role, keepContent }
}

const LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1'

export function isLfsPointer(content: Buffer): boolean {
  return content.subarray(0, LFS_POINTER_PREFIX.length).toString('utf8') === LFS_POINTER_PREFIX
}
