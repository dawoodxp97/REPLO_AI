export type ArchiveEntryType = 'file' | 'directory' | 'symlink' | 'hardlink' | 'device' | 'other'

export interface ExtractionLimits {
  maxEntries: number
  maxTotalBytes: number
  maxEntryBytes: number
  maxCompressionRatio: number
}

export const DEFAULT_EXTRACTION_LIMITS: ExtractionLimits = {
  maxEntries: 50_000,
  maxTotalBytes: 250_000_000,
  maxEntryBytes: 25_000_000,
  maxCompressionRatio: 100,
}

export type Rejection =
  | 'ABSOLUTE_PATH'
  | 'PATH_TRAVERSAL'
  | 'NUL_BYTE'
  | 'BACKSLASH'
  | 'EMPTY_PATH'
  | 'SYMLINK'
  | 'HARDLINK'
  | 'DEVICE'
  | 'UNSUPPORTED_ENTRY'
  | 'TOO_MANY_ENTRIES'
  | 'ENTRY_TOO_LARGE'
  | 'ARCHIVE_TOO_LARGE'
  | 'COMPRESSION_RATIO'

export function normalizeArchivePath(
  raw: string,
  stripComponents = 1,
): { ok: true; path: string } | { ok: false; reason: Rejection } {
  if (raw.includes('\0')) return { ok: false, reason: 'NUL_BYTE' }
  if (raw.includes('\\')) return { ok: false, reason: 'BACKSLASH' }
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) return { ok: false, reason: 'ABSOLUTE_PATH' }

  const normalized = raw.normalize('NFC')
  const segments = normalized.split('/').filter((s) => s !== '' && s !== '.')
  if (segments.some((s) => s === '..')) return { ok: false, reason: 'PATH_TRAVERSAL' }

  const kept = segments.slice(stripComponents)
  if (kept.length === 0) return { ok: false, reason: 'EMPTY_PATH' }
  return { ok: true, path: kept.join('/') }
}

export function isSafeArchivePath(raw: string, stripComponents = 1): boolean {
  return normalizeArchivePath(raw, stripComponents).ok
}

export class ExtractionGuard {
  private entries = 0
  private totalBytes = 0

  constructor(private readonly limits: ExtractionLimits = DEFAULT_EXTRACTION_LIMITS) {}

  check(
    entry: { path: string; type: ArchiveEntryType; size: number },
    compressedBytesSoFar?: number,
  ): { ok: true; path: string | null } | { ok: false; reason: Rejection } {
    if (++this.entries > this.limits.maxEntries) return { ok: false, reason: 'TOO_MANY_ENTRIES' }

    switch (entry.type) {
      case 'symlink':
        return { ok: false, reason: 'SYMLINK' }
      case 'hardlink':
        return { ok: false, reason: 'HARDLINK' }
      case 'device':
        return { ok: false, reason: 'DEVICE' }
      case 'other':
        return { ok: false, reason: 'UNSUPPORTED_ENTRY' }
      case 'directory': {
        const dir = normalizeArchivePath(entry.path)
        if (!dir.ok && dir.reason !== 'EMPTY_PATH') return { ok: false, reason: dir.reason }
        return { ok: true, path: null }
      }
      case 'file': {
        const file = normalizeArchivePath(entry.path)
        if (!file.ok) return file
        if (entry.size > this.limits.maxEntryBytes) return { ok: false, reason: 'ENTRY_TOO_LARGE' }
        this.totalBytes += entry.size
        if (this.totalBytes > this.limits.maxTotalBytes)
          return { ok: false, reason: 'ARCHIVE_TOO_LARGE' }
        if (
          compressedBytesSoFar &&
          compressedBytesSoFar > 0 &&
          this.totalBytes / compressedBytesSoFar > this.limits.maxCompressionRatio
        ) {
          return { ok: false, reason: 'COMPRESSION_RATIO' }
        }
        return { ok: true, path: file.path }
      }
    }
  }
}
