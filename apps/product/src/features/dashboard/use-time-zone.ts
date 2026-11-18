import { useMemo } from 'react'

export function useTimeZone(): string {
  return useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
}
