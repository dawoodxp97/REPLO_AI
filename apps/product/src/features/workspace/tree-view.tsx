'use client'

import type { SourceTreeEntryDto } from '@replo/contracts'
import { Badge, cn } from '@replo/ui'
import { ChevronRight } from 'lucide-react'
import { buildFileTree, type TreeNode } from '@/features/player/source/file-tree'
import { formatBytes } from '@/lib/format'

export function TreeView({
  files,
  selectedPath,
  onSelectPath,
}: {
  files: readonly SourceTreeEntryDto[]
  selectedPath: string | null
  onSelectPath: (path: string) => void
}) {
  const tree = buildFileTree(files)
  if (tree.length === 0) {
    return <p className="text-sm text-muted-foreground">No files match this filter.</p>
  }

  return (
    <nav
      aria-label="Repository files"
      className="max-h-[70dvh] w-full max-w-full overflow-y-auto rounded-lg border bg-card p-2 text-sm shadow-xs"
    >
      <TreeNodes nodes={tree} selectedPath={selectedPath} onSelectPath={onSelectPath} />
    </nav>
  )
}

function TreeNodes({
  nodes,
  selectedPath,
  onSelectPath,
}: {
  nodes: readonly TreeNode[]
  selectedPath: string | null
  onSelectPath: (path: string) => void
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) =>
        node.kind === 'folder' ? (
          <li key={`folder:${node.path}`}>
            <details open className="group">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:min-h-10 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
                <span className="truncate font-mono text-xs">{node.name}/</span>
              </summary>
              <div className="ml-3 border-l pl-1.5">
                <TreeNodes
                  nodes={node.children}
                  selectedPath={selectedPath}
                  onSelectPath={onSelectPath}
                />
              </div>
            </details>
          </li>
        ) : (
          <li key={`file:${node.entry.path}`}>
            <FileRow
              entry={node.entry}
              name={node.name}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
            />
          </li>
        ),
      )}
    </ul>
  )
}

function FileRow({
  entry,
  name,
  selectedPath,
  onSelectPath,
}: {
  entry: SourceTreeEntryDto
  name: string
  selectedPath: string | null
  onSelectPath: (path: string) => void
}) {
  const selected = entry.path === selectedPath
  if (!entry.readable) {
    return (
      <span className="flex min-h-8 items-center justify-between gap-2 rounded-md px-2 text-muted-foreground pointer-coarse:min-h-10">
        <span className="truncate font-mono text-xs">{name}</span>
        <span className="shrink-0 text-xs">binary or over 1 MB</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelectPath(entry.path)}
      className={cn(
        'flex min-h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md px-2 text-left hover:bg-accent focus-visible:-outline-offset-2 pointer-coarse:min-h-10',
        selected && 'bg-accent font-medium',
      )}
    >
      <span className="truncate font-mono text-xs">{name}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="tabular font-mono text-xs text-muted-foreground">
          {formatBytes(entry.sizeBytes)}
        </span>
        {entry.cited ? (
          <Badge variant="outline" className="shrink-0">
            cited
          </Badge>
        ) : null}
      </span>
    </button>
  )
}
