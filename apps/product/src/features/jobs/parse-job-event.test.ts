import { describe, expect, it } from 'vitest'
import { parseJobEvent } from './parse-job-event'

const VALID = {
  id: 3,
  jobId: '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f',
  type: 'stage_started',
  stage: 'ingest',
  data: null,
  at: '2026-10-23T10:00:00.000Z',
}

describe('parseJobEvent', () => {
  it('returns a valid event', () => {
    expect(parseJobEvent(JSON.stringify(VALID))).toEqual(VALID)
  })

  it('returns null for text that is not JSON', () => {
    expect(parseJobEvent('not json')).toBeNull()
  })

  it('returns null for JSON that is not an event', () => {
    expect(parseJobEvent(JSON.stringify({ ...VALID, type: 'exploded' }))).toBeNull()
    expect(parseJobEvent('null')).toBeNull()
  })
})
