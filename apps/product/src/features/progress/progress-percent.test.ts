import { describe, expect, it } from 'vitest'
import { completionPercent } from './progress-percent'

describe('completionPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(completionPercent(1, 3)).toBe(33)
    expect(completionPercent(2, 3)).toBe(67)
  })

  it('is zero for an empty tutorial', () => {
    expect(completionPercent(0, 0)).toBe(0)
  })

  it('never leaves the 0 to 100 range', () => {
    expect(completionPercent(5, 3)).toBe(100)
    expect(completionPercent(-1, 3)).toBe(0)
  })
})
