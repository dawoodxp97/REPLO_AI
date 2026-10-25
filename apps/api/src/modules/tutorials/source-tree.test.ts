import { describe, expect, it } from 'vitest'
import { MAX_INDEXED_FILE_BYTES } from '@replo/repo-analysis'
import type { SnapshotFile } from '../indexing/indexing.service'
import { toSourceTree } from './source-tree'

const SHA = '3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6'
const BLOB = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

function file(overrides: Partial<SnapshotFile> & Pick<SnapshotFile, 'path'>): SnapshotFile {
  return { blobSha: BLOB, language: 'typescript', role: 'source', sizeBytes: 120, ...overrides }
}

describe('toSourceTree', () => {
  it('sorts every file by path and keeps the pinned commit', () => {
    const tree = toSourceTree(SHA, [
      file({ path: 'src/cart.ts' }),
      file({ path: 'README.md', language: 'markdown', role: 'doc' }),
      file({ path: 'lib/index.ts' }),
    ])

    expect(tree.commitSha).toBe(SHA)
    expect(tree.files.map((entry) => entry.path)).toEqual([
      'README.md',
      'lib/index.ts',
      'src/cart.ts',
    ])
  })

  it('marks a text source file readable and reports its size, role and language', () => {
    const [entry] = toSourceTree(SHA, [file({ path: 'src/cart.ts', sizeBytes: 480 })]).files

    expect(entry).toEqual({
      path: 'src/cart.ts',
      sizeBytes: 480,
      language: 'typescript',
      role: 'source',
      readable: true,
    })
  })

  it('reads a file exactly at the 1 MB limit and refuses one byte more', () => {
    const [atLimit, overLimit] = toSourceTree(SHA, [
      file({ path: 'src/at-limit.ts', sizeBytes: MAX_INDEXED_FILE_BYTES }),
      file({ path: 'src/over-limit.ts', sizeBytes: MAX_INDEXED_FILE_BYTES + 1 }),
    ]).files

    expect(atLimit?.readable).toBe(true)
    expect(overLimit?.readable).toBe(false)
  })

  it('refuses binary assets, but reads HTML assets as text', () => {
    const [html, image] = toSourceTree(SHA, [
      file({ path: 'public/index.html', language: 'html', role: 'asset' }),
      file({ path: 'public/logo.png', language: null, role: 'asset' }),
    ]).files

    expect(html?.readable).toBe(true)
    expect(image?.readable).toBe(false)
  })

  it('lists an empty snapshot as an empty tree', () => {
    expect(toSourceTree(SHA, [])).toEqual({ commitSha: SHA, files: [] })
  })
})
