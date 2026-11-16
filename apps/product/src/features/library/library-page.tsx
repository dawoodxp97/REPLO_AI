'use client'

import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  ItemGroup,
} from '@replo/ui'
import { useState } from 'react'
import { LinkButton } from '@/components/link-button'
import { LoadMore } from '@/components/load-more'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import {
  applyLibraryFilter,
  DEFAULT_LIBRARY_FILTER,
  isFiltering,
  type LibraryFilter,
} from './library-filter'
import { LibraryToolbar } from './library-toolbar'
import { CourseRow } from './course-row'
import { useCourseList } from './use-library'
import { NewCourseAction } from '@/components/new-course-action'

export function LibraryPage() {
  const list = useCourseList()
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_LIBRARY_FILTER)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Library"
        description="Your courses, who can read them, and how far you have read."
        action={<NewCourseAction />}
      />

      <QueryBoundary query={list} errorTitle="We could not load your library">
        {(data) => {
          const items = pageItems(data)
          if (items.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No courses yet</EmptyTitle>
                  <EmptyDescription>
                    Generate one from a repository you have imported.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <LinkButton href="/repositories" variant="outline">
                    Go to repositories
                  </LinkButton>
                </EmptyContent>
              </Empty>
            )
          }
          const shown = applyLibraryFilter(items, filter)
          return (
            <div className="space-y-3">
              <LibraryToolbar filter={filter} onChange={setFilter} />
              {shown.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No courses match</EmptyTitle>
                    <EmptyDescription>
                      {list.hasNextPage
                        ? 'Only the courses loaded so far are filtered. Load more, or clear the filters.'
                        : 'Change or clear the filters to see your courses.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={() => setFilter(DEFAULT_LIBRARY_FILTER)}>
                      Clear filters
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ItemGroup>
                  {shown.map((course) => (
                    <CourseRow key={course.id} course={course} />
                  ))}
                </ItemGroup>
              )}
              {isFiltering(filter) ? (
                <p role="status" className="text-xs text-muted-foreground">
                  {shown.length} of {items.length} courses shown
                </p>
              ) : null}
              <LoadMore query={list} />
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
