import { Filter } from '../components/filter'
import { Table } from '../components/table'

const columns = [
  { key: 'title' as const, label: 'Title' },
  { key: 'rows' as const, label: 'Rows' },
]

export function ReportsPage({ reports }: { reports: { id: string; title: string; rows: number }[] }) {
  return <Table rows={reports} columns={columns} />
}
