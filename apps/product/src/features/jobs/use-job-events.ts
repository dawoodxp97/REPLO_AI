import { JobEventType, type JobEventDto } from '@replo/contracts'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/lib/env'
import { orpc } from '@/lib/orpc'
import { invalidateGenerationQueries } from './invalidate-generation-queries'
import {
  applyJobEvent,
  INITIAL_JOB_PROGRESS,
  isTerminalEvent,
  restartJobProgress,
  withConnection,
  type JobProgress,
} from './job-progress-state'
import { parseJobEvent } from './parse-job-event'

const TERMINAL_CLOSE_GRACE_MS = 1_000

export interface JobEvents {
  progress: JobProgress
  restart: () => void
}

function refreshAfterEvent(queryClient: QueryClient, event: JobEventDto) {
  if (isTerminalEvent(event.type)) {
    void invalidateGenerationQueries(queryClient)
    return
  }
  if (event.type === 'stage_started' || event.type === 'stage_completed') {
    void queryClient.invalidateQueries({
      queryKey: orpc.jobs.get.key({ input: { jobId: event.jobId } }),
    })
  }
}

export function useJobEvents(jobId: string): JobEvents {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(INITIAL_JOB_PROGRESS)
  const [generation, setGeneration] = useState(0)
  const lastSeenId = useRef(0)

  useEffect(() => {
    const source = new EventSource(`${env.apiUrl}/jobs/${jobId}/events`, { withCredentials: true })
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      source.close()
      setProgress((current) => withConnection(current, 'closed'))
    }

    const handle = (message: MessageEvent<string>) => {
      const event = parseJobEvent(message.data)
      if (!event || event.id <= lastSeenId.current) return
      lastSeenId.current = event.id
      clearTimeout(closeTimer)
      setProgress((current) => applyJobEvent(current, event))
      refreshAfterEvent(queryClient, event)
      if (isTerminalEvent(event.type)) closeTimer = setTimeout(finish, TERMINAL_CLOSE_GRACE_MS)
    }

    source.onopen = () => setProgress((current) => withConnection(current, 'live'))
    source.onerror = () => setProgress((current) => withConnection(current, 'lost'))
    for (const type of JobEventType.options) source.addEventListener(type, handle)

    return () => {
      clearTimeout(closeTimer)
      source.close()
    }
  }, [jobId, generation, queryClient])

  const restart = useCallback(() => {
    setProgress(restartJobProgress)
    setGeneration((current) => current + 1)
  }, [])

  return { progress, restart }
}
