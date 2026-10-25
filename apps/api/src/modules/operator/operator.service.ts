import type { OperatorJobDetail, OperatorJobRow } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import type { JobHistory } from '../generation/job-history.service'
import { operatorRepo } from './operator.repo'

interface OperatorDeps {
  db: Db
  jobs: Pick<JobHistory, 'operatorJobs' | 'operatorJob'>
}

export interface OperatorService {
  jobs(
    userId: string,
    input: {
      status?: OperatorJobRow['status'] | undefined
      limit: number
      cursor?: string | undefined
    },
  ): Promise<{ items: OperatorJobRow[]; nextCursor: string | null }>
  job(userId: string, jobId: string): Promise<OperatorJobDetail>
}

export function createOperatorService(deps: OperatorDeps): OperatorService {
  const operators = operatorRepo(deps.db)

  const requireOperator = async (userId: string) => {
    if (!(await operators.isOperator(userId))) notFound('Operator screen')
  }

  return {
    async jobs(userId, input) {
      await requireOperator(userId)
      const offset = Number(input.cursor ?? 0)
      const rows = await deps.jobs.operatorJobs({
        status: input.status,
        limit: input.limit + 1,
        offset,
      })
      return {
        items: rows.slice(0, input.limit),
        nextCursor: rows.length > input.limit ? String(offset + input.limit) : null,
      }
    },

    async job(userId, jobId) {
      await requireOperator(userId)
      const detail = await deps.jobs.operatorJob(jobId)
      if (!detail) notFound('Job')
      return detail
    },
  }
}
