import type { SourceTreeEntry } from '@replo/contracts'

export interface FolderNode {
  kind: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

export interface FileNode {
  kind: 'file'
  name: string
  entry: SourceTreeEntry
}

export type TreeNode = FolderNode | FileNode

export function buildFileTree(entries: readonly SourceTreeEntry[]): TreeNode[] {
  const root: FolderNode = { kind: 'folder', name: '', path: '', children: [] }

  for (const entry of entries) {
    const segments = entry.path.split('/')
    const fileName = segments.at(-1) ?? entry.path
    let folder = root
    for (const [index, segment] of segments.slice(0, -1).entries()) {
      folder = childFolder(folder, segment, segments.slice(0, index + 1).join('/'))
    }
    folder.children.push({ kind: 'file', name: fileName, entry })
  }

  return sortNodes(root.children)
}

function childFolder(parent: FolderNode, name: string, path: string): FolderNode {
  const existing = parent.children.find(
    (child): child is FolderNode => child.kind === 'folder' && child.name === name,
  )
  if (existing) return existing
  const created: FolderNode = { kind: 'folder', name, path, children: [] }
  parent.children.push(created)
  return created
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) =>
      node.kind === 'folder' ? { ...node, children: sortNodes(node.children) } : node,
    )
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    })
}
