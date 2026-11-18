export interface Column<Row> {
  key: keyof Row
  label: string
}

export function Table<Row extends { id: string }>({ rows, columns }: { rows: Row[]; columns: Column<Row>[] }) {
  return (
    <table>
      <thead>
        <tr>{columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>{columns.map((column) => <td key={String(column.key)}>{String(row[column.key])}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}
