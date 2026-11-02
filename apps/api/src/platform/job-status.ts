export const TERMINAL_STATUSES = ['succeeded', 'failed', 'canceled'] as const

export const IDLE_STATUSES = ['queued', 'waiting_retry', 'stalled'] as const
export const IN_FLIGHT_STATUSES = [...IDLE_STATUSES, 'running', 'canceling'] as const
export const RETRYABLE_STATUSES = ['failed', 'canceled'] as const

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]

export const isStatusIn = <T extends string>(statuses: readonly T[], status: string): status is T =>
  statuses.some((candidate) => candidate === status)

export const isTerminalStatus = (status: string): status is TerminalStatus =>
  isStatusIn(TERMINAL_STATUSES, status)

export const jobLink = (jobId: string) => `/jobs/${jobId}`
