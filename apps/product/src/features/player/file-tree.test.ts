import type { SourceTreeEntry } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { buildFileTree, defaultSourcePath, type FolderNode, type TreeNode } from './file-tree'

function entry(path: string, readable = true, cited = false): SourceTreeEntry {
  return { path, sizeBytes: 100, language: 'typescript', role: 'source', readable, cited }
}

function folder(nodes: TreeNode[], name: string): FolderNode {
  const found = nodes.find((node) => node.kind === 'folder' && node.name === name)
  if (found?.kind !== 'folder') throw new Error(`no folder ${name}`)
  return found
}

describe('buildFileTree', () => {
  it('nests files under their folders', () => {
    const tree = buildFileTree([
      entry('src/cart/thunks.ts'),
      entry('src/cart/state.ts'),
      entry('README.md'),
    ])

    const src = folder(tree, 'src')
    const cart = folder(src.children, 'cart')
    expect(cart.children.map((node) => node.name)).toEqual(['state.ts', 'thunks.ts'])
    expect(cart.path).toBe('src/cart')
  })

  it('lists folders before files and sorts each group by name', () => {
    const tree = buildFileTree([entry('zeta.ts'), entry('lib/a.ts'), entry('alpha.ts')])

    expect(tree.map((node) => node.name)).toEqual(['lib', 'alpha.ts', 'zeta.ts'])
  })

  it('keeps the readability of each file', () => {
    const tree = buildFileTree([entry('public/logo.png', false)])

    const file = folder(tree, 'public').children[0]
    expect(file?.kind === 'file' && file.entry.readable).toBe(false)
  })

  it('returns no nodes for an empty repository', () => {
    expect(buildFileTree([])).toEqual([])
  })
})

describe('defaultSourcePath', () => {
  it('opens the first cited file in tree order', () => {
    const tree = buildFileTree([
      entry('zeta.ts', true, true),
      entry('src/ui/card.tsx', true, true),
      entry('src/cart/thunks.ts', true, true),
    ])
    expect(defaultSourcePath(tree)).toBe('src/cart/thunks.ts')
  })

  it('skips cited files that cannot be read', () => {
    const tree = buildFileTree([entry('a/big.bin', false, true), entry('b/ok.ts', true, true)])
    expect(defaultSourcePath(tree)).toBe('b/ok.ts')
  })

  it('falls back to the root README', () => {
    const tree = buildFileTree([entry('docs/README.md'), entry('src/a.ts'), entry('README.md')])
    expect(defaultSourcePath(tree)).toBe('README.md')
  })

  it('returns null when nothing qualifies', () => {
    expect(defaultSourcePath(buildFileTree([entry('src/a.ts')]))).toBeNull()
  })
})
