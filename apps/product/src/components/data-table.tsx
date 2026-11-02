import { cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@replo/ui'
import type { ReactNode } from 'react'

export interface DataColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  minWidth,
}: {
  columns: readonly DataColumn<T>[]
  rows: readonly T[]
  getKey: (row: T) => string
  minWidth: string
}) {
  return (
    <div className="rounded-lg border bg-card shadow-xs">
      <Table className={minWidth}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.header} scope="col">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.header} className={cn(column.className)}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
