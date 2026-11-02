import { JobEventDto } from '@replo/contracts'

export function parseJobEvent(raw: string): JobEventDto | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = JobEventDto.safeParse(json)
  return parsed.success ? parsed.data : null
}
