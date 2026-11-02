import type { SourceTreeEntry } from '@replo/contracts'
import { Badge, cn } from '@replo/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { TutorialLinks } from '@/lib/tutorial-paths'
import type { TreeNode } from './file-tree'

export interface FileTreeListProps {
  links: TutorialLinks
  nodes: readonly TreeNode[]
  selectedPath: string | null
}

const ROW_CLASS = 'flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5'

export function FileTreeList(props: FileTreeListProps) {
  return (
    <ul className="space-y-0.5">
      {props.nodes.map((node) =>
        node.kind === 'folder' ? (
          <li key={`folder:${node.path}`}>
            <details open className="group">
              <summary
                className={cn(
                  ROW_CLASS,
                  'cursor-pointer justify-start gap-1 text-muted-foreground list-none hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden',
                )}
              >
                <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
                <span className="truncate font-mono text-xs">{node.name}/</span>
              </summary>
              <div className="ml-3 border-l pl-1.5">
                <FileTreeList {...props} nodes={node.children} />
              </div>
            </details>
          </li>
        ) : (
          <li key={`file:${node.entry.path}`}>
            <FileRow {...props} entry={node.entry} name={node.name} />
          </li>
        ),
      )}
    </ul>
  )
}

function FileRow({
  entry,
  name,
  links,
  selectedPath,
}: FileTreeListProps & { entry: SourceTreeEntry; name: string }) {
  if (!entry.readable) {
    return (
      <span className={cn(ROW_CLASS, 'text-muted-foreground')}>
        <span className="truncate font-mono text-xs">{name}</span>
        <span className="shrink-0 text-xs">binary or over 1 MB</span>
      </span>
    )
  }

  return (
    <Link
      href={links.sourceExplorer(entry.path)}
      aria-current={entry.path === selectedPath ? 'page' : undefined}
      className={cn(
        ROW_CLASS,
        'hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium',
      )}
    >
      <span className="truncate font-mono text-xs">{name}</span>
      {entry.cited ? (
        <Badge variant="outline" className="shrink-0">
          cited
        </Badge>
      ) : null}
    </Link>
  )
}
