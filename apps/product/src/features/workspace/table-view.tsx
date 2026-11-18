'use client'

import type { SourceTreeEntryDto } from '@replo/contracts'
import { Badge } from '@replo/ui'
import { DataTable, type DataColumn } from '@/components/data-table'
import { formatBytes } from '@/lib/format'

function columns(onSelectPath: (path: string) => void): DataColumn<SourceTreeEntryDto>[] {
  return [
    {
      header: 'Path',
      cell: (file) =>
        file.readable ? (
          <button
            type="button"
            onClick={() => onSelectPath(file.path)}
            className="font-mono text-xs hover:underline focus-visible:-outline-offset-2 pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {file.path}
          </button>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{file.path}</span>
        ),
    },
    {
      header: 'Role',
      cell: (file) => <Badge variant="outline">{file.role}</Badge>,
    },
    {
      header: 'Language',
      cell: (file) => <span className="font-mono text-xs">{file.language ?? '—'}</span>,
    },
    {
      header: 'Size',
      cell: (file) => (
        <span className="tabular text-right font-mono text-xs">{formatBytes(file.sizeBytes)}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'Cited',
      cell: (file) => (file.cited ? 'Yes' : 'No'),
      className: 'text-right',
    },
  ]
}

export function TableView({
  files,
  onSelectPath,
}: {
  files: readonly SourceTreeEntryDto[]
  onSelectPath: (path: string) => void
}) {
  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">No files match this filter.</p>
  }

  return (
    <DataTable
      columns={columns(onSelectPath)}
      rows={files}
      getKey={(file) => file.path}
      minWidth="min-w-[40rem]"
    />
  )
}
