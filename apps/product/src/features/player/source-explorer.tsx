'use client'

import type { SourceTreeEntry, TutorialOverviewDto } from '@replo/contracts'
import { Badge, Skeleton } from '@replo/ui'
import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ErrorPanel } from '@/components/error-panel'
import { orpc } from '@/lib/orpc'
import { tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'
import { buildFileTree, type TreeNode } from './file-tree'
import { SourceView } from './source-view'

export function SourceExplorer({ tutorial }: { tutorial: TutorialRef }) {
  const params = useSearchParams()
  const shareToken = params.get('share') ?? undefined
  const selectedPath = params.get('path')
  const overview = useQuery(orpc.tutorials.get.queryOptions({ input: { ...tutorial, shareToken } }))

  if (overview.isPending)
    return <Skeleton aria-busy="true" className="m-4 h-96 w-[calc(100%-2rem)]" />

  if (overview.isError || !overview.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorPanel
          title="This tutorial is not available"
          description="Check the link, or return to the tutorial overview."
        />
      </div>
    )
  }

  return (
    <ExplorerLayout
      tutorial={tutorial}
      overview={overview.data}
      selectedPath={selectedPath}
      shareToken={shareToken}
    />
  )
}

function ExplorerLayout({
  tutorial,
  overview,
  selectedPath,
  shareToken,
}: {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  selectedPath: string | null
  shareToken: string | undefined
}) {
  const tree = useQuery(
    orpc.tutorials.sourceTree.queryOptions({
      input: { versionId: overview.versionId, shareToken },
    }),
  )
  const citedPaths = useCitedPaths(overview, shareToken)

  return (
    <main className="grid gap-6 px-4 py-8 sm:px-6 md:grid-cols-[18rem_minmax(0,1fr)]">
      <nav aria-label="Repository files" className="min-w-0 space-y-2 text-sm">
        <p className="font-medium">Files at the pinned commit</p>
        {tree.isPending ? (
          <Skeleton aria-busy="true" className="h-48 w-full" />
        ) : tree.isError ? (
          <p role="alert" className="text-destructive">
            The file tree could not be loaded.
          </p>
        ) : tree.data.files.length === 0 ? (
          <p className="text-muted-foreground">The repository has no recorded files.</p>
        ) : (
          <FileTreeList
            tutorial={tutorial}
            nodes={buildFileTree(tree.data.files)}
            selectedPath={selectedPath}
            citedPaths={citedPaths}
            shareToken={shareToken}
          />
        )}
      </nav>

      <section aria-label="Selected file" className="min-w-0">
        {selectedPath ? (
          <SourceView
            versionId={overview.versionId}
            path={selectedPath}
            range={null}
            shareToken={shareToken}
            windowed
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a file to read it at the pinned commit.
          </p>
        )}
      </section>
    </main>
  )
}

function useCitedPaths(
  overview: TutorialOverviewDto,
  shareToken: string | undefined,
): ReadonlySet<string> {
  const chapters = useQueries({
    queries: overview.outline.map((chapter) =>
      orpc.tutorials.getChapter.queryOptions({
        input: { versionId: overview.versionId, chapterKey: chapter.key, shareToken },
      }),
    ),
  })
  return new Set(
    chapters.flatMap((chapter) =>
      Object.values(chapter.data?.sourceRefs ?? {}).map((ref) => ref.path),
    ),
  )
}

interface FileTreeListProps {
  tutorial: TutorialRef
  nodes: readonly TreeNode[]
  selectedPath: string | null
  citedPaths: ReadonlySet<string>
  shareToken: string | undefined
}

function FileTreeList(props: FileTreeListProps) {
  return (
    <ul className="space-y-0.5">
      {props.nodes.map((node) =>
        node.kind === 'folder' ? (
          <li key={`folder:${node.path}`}>
            <details open>
              <summary className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-accent">
                {node.name}/
              </summary>
              <div className="pl-3">
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
  tutorial,
  selectedPath,
  citedPaths,
  shareToken,
}: FileTreeListProps & { entry: SourceTreeEntry; name: string }) {
  if (!entry.readable) {
    return (
      <span className="flex min-w-0 items-center justify-between gap-2 px-2 py-1 text-muted-foreground">
        <span className="truncate font-mono text-xs">{name}</span>
        <span className="shrink-0 text-xs">binary or over 1 MB</span>
      </span>
    )
  }

  const query = new URLSearchParams({
    path: entry.path,
    ...(shareToken ? { share: shareToken } : {}),
  })
  return (
    <Link
      href={`${tutorialPath(tutorial)}/code?${query.toString()}`}
      aria-current={entry.path === selectedPath ? 'page' : undefined}
      className="flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent aria-[current=page]:bg-accent"
    >
      <span className="truncate font-mono text-xs">{name}</span>
      {citedPaths.has(entry.path) ? <Badge className="shrink-0">cited</Badge> : null}
    </Link>
  )
}
