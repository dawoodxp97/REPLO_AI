import type { Pool } from 'pg'
import type { Report, ReportInput } from '../models/report'

export function reportsRepository(pool: Pool) {
  return {
    async list(ownerId: string): Promise<Report[]> {
      const result = await pool.query(
        'select id, owner_id, title, rows from reports where owner_id = $1',
        [ownerId],
      )
      return result.rows
    },
    async insert(ownerId: string, input: ReportInput): Promise<Report> {
      const result = await pool.query(
        'insert into reports (owner_id, title) values ($1, $2) returning id, owner_id, title, 0 as rows',
        [ownerId, input.title],
      )
      return result.rows[0]
    },
  }
}
