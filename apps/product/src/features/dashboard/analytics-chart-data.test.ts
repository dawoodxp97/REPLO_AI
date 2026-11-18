import { describe, expect, it } from 'vitest'
import { bucketRows, formatBucket } from './analytics-chart-data'

describe('analytics chart data', () => {
  it('merges series into one sorted bucket row', () => {
    const rows = bucketRows([
      {
        key: 'job_succeeded',
        label: 'Generations finished',
        points: [
          { bucket: '2026-11-02', value: 3 },
          { bucket: '2026-11-01', value: 1 },
        ],
      },
      {
        key: 'job_failed',
        label: 'Generations failed',
        points: [{ bucket: '2026-11-02', value: 2 }],
      },
    ])
    expect(rows).toEqual([
      { bucket: '2026-11-01', values: { job_succeeded: 1 } },
      { bucket: '2026-11-02', values: { job_succeeded: 3, job_failed: 2 } },
    ])
  })

  it('formats a bucket as a short date', () => {
    expect(formatBucket('2026-11-02')).toBe('2 Nov')
    expect(formatBucket('not-a-date')).toBe('not-a-date')
  })
})
