import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { isActiveJob } from './job-status'
import { useJobEvents } from './use-job-events'

const POLL_WITHOUT_STREAM_MS = 5_000

export function useJobPage(jobId: string) {
  const { progress, restart } = useJobEvents(jobId)
  const job = useQuery(
    orpc.jobs.get.queryOptions({
      input: { jobId },
      refetchInterval: (query) => {
        const status = query.state.data?.status
        if (status !== undefined && !isActiveJob(status)) return false
        return progress.connection === 'lost' ? POLL_WITHOUT_STREAM_MS : false
      },
    }),
  )
  return { job, progress, restart }
}
