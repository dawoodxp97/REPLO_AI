'use client'

import type { CourseOverviewDto } from '@replo/contracts'
import { Skeleton } from '@replo/ui'
import type { UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { shortSha } from '@/lib/format'
import type { CourseLinks, CourseRef } from '@/lib/course-paths'
import { useCourseLinks, useCourseOverview } from '../use-course'
import { defaultSourcePath, type TreeNode } from './file-tree'
import { FileTreeList } from './file-tree-list'
import { NoSourceShown } from './reference-source'
import { SourceView } from './source-view'
import { useSourceTree } from './use-source'

export function SourceExplorer({ course }: { course: CourseRef }) {
  const selectedPath = useSearchParams().get('path')
  const { linkContext, overview } = useCourseOverview(course)
  const links = useCourseLinks(course, linkContext)

  return (
    <div className="space-y-8">
      <QueryBoundary
        query={overview}
        errorTitle="This course is not available"
        errorDescription="Check the link, or return to the course overview."
        loading={<Skeleton aria-busy="true" className="h-96 w-full" />}
      >
        {(data) => <ExplorerLayout overview={data} links={links} selectedPath={selectedPath} />}
      </QueryBoundary>
    </div>
  )
}

interface ExplorerLayoutProps {
  overview: CourseOverviewDto
  links: CourseLinks
  selectedPath: string | null
}

function ExplorerLayout({ overview, links, selectedPath }: ExplorerLayoutProps) {
  const tree = useSourceTree(overview.versionId)
  const shownPath = selectedPath ?? (tree.data ? defaultSourcePath(tree.data) : null)

  return (
    <>
      <PageHeader
        title="Source explorer"
        description={
          <>
            {overview.course.title}, at commit{' '}
            <span className="font-mono">{shortSha(overview.commitSha)}</span>.
          </>
        }
        action={
          <LinkButton href={links.overview()} variant="outline" size="sm">
            Back to the course
          </LinkButton>
        }
      />
      <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <FileTreePanel tree={tree} links={links} shownPath={shownPath} />
        <section aria-label="Selected file" className="min-w-0">
          {shownPath ? (
            <SourceView versionId={overview.versionId} path={shownPath} range={null} windowed />
          ) : (
            <NoSourceShown
              title="No file selected"
              description="Choose a file to read it at the pinned commit."
            />
          )}
        </section>
      </div>
    </>
  )
}

interface FileTreePanelProps {
  tree: UseQueryResult<TreeNode[]>
  links: CourseLinks
  shownPath: string | null
}

function FileTreePanel({ tree, links, shownPath }: FileTreePanelProps) {
  return (
    <aside className="min-w-0 space-y-2">
      <h2 className="text-sm font-semibold tracking-tight">Files</h2>
      <nav
        aria-label="Repository files"
        className="max-h-[70dvh] overflow-y-auto rounded-lg border bg-card p-2 text-sm shadow-xs"
      >
        {tree.isPending ? (
          <Skeleton aria-busy="true" className="h-48 w-full" />
        ) : tree.isError ? (
          <p role="alert" className="p-2 text-destructive">
            The file tree could not be loaded. Reload the page to try again.
          </p>
        ) : tree.data.length === 0 ? (
          <p className="p-2 text-muted-foreground">The repository has no recorded files.</p>
        ) : (
          <FileTreeList links={links} nodes={tree.data} selectedPath={shownPath} />
        )}
      </nav>
    </aside>
  )
}
