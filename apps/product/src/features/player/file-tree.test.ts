import type { SourceTreeEntry } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { buildFileTree, type FolderNode, type TreeNode } from './file-tree'

function entry(path: string, readable = true): SourceTreeEntry {
  return { path, sizeBytes: 100, language: 'typescript', role: 'source', readable }
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
