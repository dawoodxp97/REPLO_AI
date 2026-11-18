'use client'

import { JOB_STATUSES, type JobStatus } from '@replo/contracts'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@replo/ui'
import { LoadMore } from '@/components/load-more'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { JOB_STATUS_LABELS } from '@/features/jobs/job-status'
import { cursorPaging, pageItems } from '@/lib/paging'
import { orpc } from '@/lib/orpc'
import { AdminJobsTable } from './admin-jobs-table'

const PAGE_SIZE = 50

export function AdminJobs() {
  const [status, setStatus] = useState<JobStatus | undefined>(undefined)
  const jobs = useInfiniteQuery(
    orpc.admin.jobs.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor, status }),
      ...cursorPaging,
    }),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jobs"
        description="Every user's generations, with stage, status and error code."
      />
      <div className="flex flex-wrap gap-1.5">
        <FilterChip label="All" active={status === undefined} onClick={() => setStatus(undefined)} />
        {JOB_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={JOB_STATUS_LABELS[value]}
            active={status === value}
            onClick={() => setStatus(value)}
          />
        ))}
      </div>
      <QueryBoundary query={jobs} errorTitle="We could not load jobs">
        {(data) => {
          const items = pageItems(data)
          if (items.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No jobs match</EmptyTitle>
                  <EmptyDescription>
                    {status
                      ? 'No jobs are in this state right now.'
                      : 'Generation jobs appear here as soon as someone starts one.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          }
          return (
            <div className="space-y-4">
              <AdminJobsTable rows={items} />
              <LoadMore query={jobs} />
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors pointer-coarse:h-10 pointer-coarse:min-w-10 ' +
        (active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground')
      }
    >
      {label}
    </button>
  )
}