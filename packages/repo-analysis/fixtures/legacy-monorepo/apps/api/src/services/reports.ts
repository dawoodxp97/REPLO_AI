import type { ReportInput } from '../models/report'
import type { reportsRepository } from '../repositories/reports'

export function reportsService(reports: ReturnType<typeof reportsRepository>) {
  return {
    list: (ownerId: string) => reports.list(ownerId),
    create: (ownerId: string, input: ReportInput) => reports.insert(ownerId, input),
  }
}
