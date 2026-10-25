import { describe, expect, it } from 'vitest'
import { decideFile, isLfsPointer } from './file-policy'

describe('decideFile', () => {
  it('skips excluded directories and env files entirely', () => {
    expect(decideFile('node_modules/x/index.js', 10)).toEqual({ kind: 'skip' })
    expect(decideFile('.env.local', 10)).toEqual({ kind: 'skip' })
  })

  it('records and keeps content for an indexable source file', () => {
    expect(decideFile('src/cart.ts', 400)).toEqual({
      kind: 'record',
      language: 'typescript',
      role: 'source',
      keepContent: true,
    })
  })

  it('records binaries as metadata only', () => {
    expect(decideFile('public/logo.png', 90_000)).toMatchObject({
      role: 'asset',
      keepContent: false,
    })
  })

  it('records but does not keep content above the 1 MB index limit', () => {
    expect(decideFile('src/generated.ts', 1_000_001)).toMatchObject({ keepContent: false })
    expect(decideFile('src/at-limit.ts', 1_000_000)).toMatchObject({ keepContent: true })
  })
})

describe('isLfsPointer', () => {
  it('detects a Git LFS pointer file', () => {
    expect(
      isLfsPointer(
        Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 12\n'),
      ),
    ).toBe(true)
  })

  it('does not flag ordinary text', () => {
    expect(isLfsPointer(Buffer.from('export const version = 1\n'))).toBe(false)
  })
})
