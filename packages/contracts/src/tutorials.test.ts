import { describe, expect, it } from 'vitest'
import { SourceTreeDto } from './tutorials'

const SHA = '3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6'
const entry = {
  path: 'src/cart.ts',
  sizeBytes: 480,
  language: 'typescript',
  role: 'source',
  readable: true,
}

describe('SourceTreeDto', () => {
  it('accepts a tree at a pinned commit', () => {
    expect(SourceTreeDto.parse({ commitSha: SHA, files: [entry] }).files).toHaveLength(1)
  })

  it('refuses a file role that the analyzer cannot produce', () => {
    expect(() =>
      SourceTreeDto.parse({ commitSha: SHA, files: [{ ...entry, role: 'secret' }] }),
    ).toThrow()
  })

  it('refuses a commit that is not a full SHA', () => {
    expect(() => SourceTreeDto.parse({ commitSha: 'main', files: [] })).toThrow()
  })

  it('refuses a negative size', () => {
    expect(() =>
      SourceTreeDto.parse({ commitSha: SHA, files: [{ ...entry, sizeBytes: -1 }] }),
    ).toThrow()
  })
})
