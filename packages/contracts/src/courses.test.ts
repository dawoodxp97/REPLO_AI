import { describe, expect, it } from 'vitest'
import { SourceTreeDto } from './workspace'

const SHA = '3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6'
const VERSION_ID = '0190f6a2-7c1e-7d4a-8f3b-2a9c4e5d6f70'
const entry = {
  path: 'src/cart.ts',
  sizeBytes: 480,
  language: 'typescript',
  role: 'source',
  readable: true,
  cited: false,
}

describe('SourceTreeDto', () => {
  it('accepts a tree at a pinned commit', () => {
    const tree = SourceTreeDto.parse({ versionId: VERSION_ID, commitSha: SHA, files: [entry] })
    expect(tree.files).toHaveLength(1)
    expect(tree.versionId).toBe(VERSION_ID)
  })

  it('refuses a file role that the analyzer cannot produce', () => {
    expect(() =>
      SourceTreeDto.parse({
        versionId: VERSION_ID,
        commitSha: SHA,
        files: [{ ...entry, role: 'secret' }],
      }),
    ).toThrow()
  })

  it('refuses a commit that is not a full SHA', () => {
    expect(() =>
      SourceTreeDto.parse({ versionId: VERSION_ID, commitSha: 'main', files: [] }),
    ).toThrow()
  })

  it('refuses a negative size', () => {
    expect(() =>
      SourceTreeDto.parse({
        versionId: VERSION_ID,
        commitSha: SHA,
        files: [{ ...entry, sizeBytes: -1 }],
      }),
    ).toThrow()
  })
})