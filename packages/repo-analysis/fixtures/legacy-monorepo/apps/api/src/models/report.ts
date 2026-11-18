export interface Report {
  id: string
  ownerId: string
  title: string
  rows: number
}

export interface ReportInput {
  title: string
  from: string
  to: string
}
