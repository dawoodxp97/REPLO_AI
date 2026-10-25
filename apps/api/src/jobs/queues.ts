import type PgBoss from 'pg-boss'
import { GENERATE_TUTORIAL, MAX_ATTEMPTS, PURGE_RETENTION, REAP_STALLED_JOBS } from './schemas'

const RETRY_DELAY_SECONDS = 30

export async function declareQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(GENERATE_TUTORIAL, {
    name: GENERATE_TUTORIAL,
    retryLimit: MAX_ATTEMPTS - 1,
    retryDelay: RETRY_DELAY_SECONDS,
    retryBackoff: true,
  })
  await boss.createQueue(REAP_STALLED_JOBS, { name: REAP_STALLED_JOBS })
  await boss.createQueue(PURGE_RETENTION, { name: PURGE_RETENTION })
}
