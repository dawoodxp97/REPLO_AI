import { JobEventDto, JobEventType } from '@replo/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { env } from '@/lib/env'
import { orpc } from '@/lib/orpc'
import {
  applyJobEvent,
  INITIAL_JOB_PROGRESS,
  isTerminalEvent,
  withConnection,
  type JobProgress,
} from './job-progress-state'

export function useJobEvents(jobId: string): JobProgress {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(INITIAL_JOB_PROGRESS)

  useEffect(() => {
    const source = new EventSource(`${env.apiUrl}/jobs/${jobId}/events`, { withCredentials: true })

    const handle = (message: MessageEvent<string>) => {
      const event = JobEventDto.parse(JSON.parse(message.data))
      setProgress((current) => applyJobEvent(current, event))
      if (isTerminalEvent(event.type)) {
        source.close()
        void queryClient.invalidateQueries({ queryKey: orpc.jobs.key() })
      }
    }

    source.onopen = () => setProgress((current) => withConnection(current, 'live'))
    source.onerror = () => setProgress((current) => withConnection(current, 'lost'))
    for (const type of JobEventType.options) source.addEventListener(type, handle)

    return () => source.close()
  }, [jobId, queryClient])

  return progress
}
