import type { AdminUserRow } from '@replo/contracts'
import { Badge, Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@replo/ui'
import { DataTable, type DataColumn } from '@/components/data-table'
import { formatDateTime } from '@/lib/format'

const COLUMNS: readonly DataColumn<AdminUserRow>[] = [
  {
    header: 'User',
    cell: (row) => (
      <div className="space-y-0.5">
        <p className="font-medium">{row.name ?? row.email ?? row.id}</p>
        {row.email && row.name ? (
          <p className="text-xs text-muted-foreground">{row.email}</p>
        ) : null}
      </div>
    ),
  },
  {
    header: 'Role',
    cell: (row) => (
      <Badge variant={row.role === 'admin' ? 'default' : 'outline'}>
        {row.role === 'admin' ? 'Admin' : 'User'}
      </Badge>
    ),
  },
  {
    header: 'Repositories',
    cell: (row) => <span className="tabular font-mono text-xs">{row.repositories}</span>,
  },
  {
    header: 'Courses',
    cell: (row) => <span className="tabular font-mono text-xs">{row.courses}</span>,
  },
  {
    header: 'Jobs',
    cell: (row) => <span className="tabular font-mono text-xs">{row.jobs}</span>,
  },
  {
    header: 'Joined',
    cell: (row) => formatDateTime(row.createdAt),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
  {
    header: 'Last seen',
    cell: (row) => (row.lastSeenAt ? formatDateTime(row.lastSeenAt) : '—'),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
]

export function AdminUsersTable({ rows }: { rows: readonly AdminUserRow[] }) {
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No users yet</EmptyTitle>
          <EmptyDescription>Users appear here as soon as they sign in.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return <DataTable columns={COLUMNS} rows={rows} getKey={(row) => row.id} minWidth="min-w-3xl" />
}