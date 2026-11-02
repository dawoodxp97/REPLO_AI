import type { OperatorJobDetail, OperatorJobRow } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound, requireFound } from '../../platform/errors'
import { decodeOffset, offsetPage } from '../../platform/pagination'
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
      const offset = decodeOffset(input.cursor)
      const rows = await deps.jobs.operatorJobs({
        status: input.status,
        limit: input.limit + 1,
        offset,
      })
      return offsetPage(rows, offset, input.limit)
    },

    async job(userId, jobId) {
      await requireOperator(userId)
      return requireFound(await deps.jobs.operatorJob(jobId), 'Job')
    },
  }
}
