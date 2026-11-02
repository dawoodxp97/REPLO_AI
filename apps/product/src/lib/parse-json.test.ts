import { JobEventDto } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { parseJsonWith } from './parse-json'

const VALID = {
  id: 3,
  jobId: '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f',
  type: 'stage_started',
  stage: 'ingest',
  data: null,
  at: '2026-10-23T10:00:00.000Z',
}

describe('parseJsonWith', () => {
  it('returns a valid value', () => {
    expect(parseJsonWith(JobEventDto, JSON.stringify(VALID))).toEqual(VALID)
  })

  it('returns null for text that is not JSON', () => {
    expect(parseJsonWith(JobEventDto, 'not json')).toBeNull()
  })

  it('returns null for JSON that does not match the schema', () => {
    expect(parseJsonWith(JobEventDto, JSON.stringify({ ...VALID, type: 'exploded' }))).toBeNull()
    expect(parseJsonWith(JobEventDto, 'null')).toBeNull()
  })
})
