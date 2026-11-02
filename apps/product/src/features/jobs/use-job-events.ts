import { JobEventDto, JobEventType } from '@replo/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEventSource } from '@/hooks/use-event-source'
import { env } from '@/lib/env'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { orpc } from '@/lib/orpc'
import { parseJsonWith } from '@/lib/parse-json'
import {
  applyJobEvent,
  INITIAL_JOB_PROGRESS,
  isTerminalEvent,
  restartJobProgress,
  withConnection,
  type JobProgress,
} from './job-progress-state'

const TERMINAL_CLOSE_GRACE_MS = 1_000
const STAGE_REFRESH_INTERVAL_MS = 5_000

export interface JobEvents {
  progress: JobProgress
  restart: () => void
}

export function useJobEvents(jobId: string): JobEvents {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(INITIAL_JOB_PROGRESS)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(closeTimer.current)
      clearTimeout(refreshTimer.current)
    },
    [],
  )

  const refreshJob = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.jobs.get.key({ input: { jobId } }) })
  }, [queryClient, jobId])

  const handle = (raw: string) => {
    const event = parseJsonWith(JobEventDto, raw)
    if (!event) return
    clearTimeout(closeTimer.current)
    setProgress((current) => applyJobEvent(current, event))
    if (isTerminalEvent(event.type)) {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = undefined
      refreshJob()
      void invalidateGenerationQueries(queryClient)
      closeTimer.current = setTimeout(
        () => setProgress((current) => withConnection(current, 'closed')),
        TERMINAL_CLOSE_GRACE_MS,
      )
    } else if (
      (event.type === 'stage_started' || event.type === 'stage_completed') &&
      refreshTimer.current === undefined
    ) {
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = undefined
        refreshJob()
      }, STAGE_REFRESH_INTERVAL_MS)
    }
  }

  useEventSource({
    url: `${env.apiUrl}/jobs/${jobId}/events`,
    events: JobEventType.options,
    enabled: progress.connection !== 'closed',
    onMessage: handle,
    onOpen: () => setProgress((current) => withConnection(current, 'live')),
    onError: () => setProgress((current) => withConnection(current, 'lost')),
  })

  const restart = useCallback(() => {
    setProgress(restartJobProgress)
  }, [])

  return { progress, restart }
}
