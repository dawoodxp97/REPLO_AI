'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@replo/ui'
import { LoadMore } from '@/components/load-more'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { TextField } from '@/components/text-field'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { cursorPaging, pageItems } from '@/lib/paging'
import { orpc } from '@/lib/orpc'
import { AdminUsersTable } from './admin-users-table'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 250

export function AdminUsers() {
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const users = useInfiniteQuery(
    orpc.admin.users.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor, q: query || undefined }),
      ...cursorPaging,
    }),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Every account with repository, course and job counts."
      />
      <div className="max-w-sm">
        <TextField
          id="admin-user-search"
          label="Search users"
          placeholder="Name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <QueryBoundary query={users} errorTitle="We could not load users">
        {(data) => {
          const items = pageItems(data)
          if (items.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No users match</EmptyTitle>
                  <EmptyDescription>
                    {query
                      ? 'Change or clear the search to see more users.'
                      : 'Users appear here as soon as they sign in.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          }
          return (
            <div className="space-y-4">
              <AdminUsersTable rows={items} />
              <LoadMore query={users} />
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}