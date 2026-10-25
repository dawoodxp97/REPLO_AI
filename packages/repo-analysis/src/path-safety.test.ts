import { describe, expect, it } from 'vitest'
import { ExtractionGuard, isSafeArchivePath, normalizeArchivePath } from './path-safety'

describe('normalizeArchivePath', () => {
  it('strips the GitHub wrapper directory', () => {
    expect(normalizeArchivePath('acme-shop-abc123/src/index.ts')).toEqual({
      ok: true,
      path: 'src/index.ts',
    })
  })

  it.each([
    ['/etc/passwd', 'ABSOLUTE_PATH'],
    ['C:/Windows/system32', 'ABSOLUTE_PATH'],
    ['wrap/../../etc/passwd', 'PATH_TRAVERSAL'],
    ['wrap/src/../../../x', 'PATH_TRAVERSAL'],
    ['wrap\\evil', 'BACKSLASH'],
    ['wrap/a\0b', 'NUL_BYTE'],
    ['wrap/', 'EMPTY_PATH'],
  ])('rejects %s', (raw, reason) => {
    expect(normalizeArchivePath(raw)).toEqual({ ok: false, reason })
  })

  it('isSafeArchivePath mirrors normalize', () => {
    expect(isSafeArchivePath('w/ok.ts')).toBe(true)
    expect(isSafeArchivePath('w/../bad')).toBe(false)
  })
})

describe('ExtractionGuard', () => {
  const file = (path: string, size = 10) => ({ path, type: 'file' as const, size })

  it('accepts regular files and normalises paths', () => {
    const guard = new ExtractionGuard()
    expect(guard.check(file('w/src/a.ts'))).toEqual({ ok: true, path: 'src/a.ts' })
  })

  it.each(['symlink', 'hardlink', 'device', 'other'] as const)('rejects %s entries', (type) => {
    const guard = new ExtractionGuard()
    expect(guard.check({ path: 'w/link', type, size: 0 }).ok).toBe(false)
  })

  it('caps entry count', () => {
    const guard = new ExtractionGuard({
      maxEntries: 2,
      maxTotalBytes: 1e9,
      maxEntryBytes: 1e9,
      maxCompressionRatio: 1e9,
    })
    expect(guard.check(file('w/a')).ok).toBe(true)
    expect(guard.check(file('w/b')).ok).toBe(true)
    expect(guard.check(file('w/c'))).toEqual({ ok: false, reason: 'TOO_MANY_ENTRIES' })
  })

  it('caps single-entry and total size', () => {
    const guard = new ExtractionGuard({
      maxEntries: 100,
      maxTotalBytes: 100,
      maxEntryBytes: 60,
      maxCompressionRatio: 1e9,
    })
    expect(guard.check(file('w/big', 61))).toEqual({ ok: false, reason: 'ENTRY_TOO_LARGE' })
    expect(guard.check(file('w/a', 60)).ok).toBe(true)
    expect(guard.check(file('w/b', 60))).toEqual({ ok: false, reason: 'ARCHIVE_TOO_LARGE' })
  })

  it('detects archive bombs by compression ratio', () => {
    const guard = new ExtractionGuard({
      maxEntries: 100,
      maxTotalBytes: 1e12,
      maxEntryBytes: 1e12,
      maxCompressionRatio: 100,
    })
    expect(guard.check(file('w/zeros', 1_000_000), 1_000)).toEqual({
      ok: false,
      reason: 'COMPRESSION_RATIO',
    })
  })
})
