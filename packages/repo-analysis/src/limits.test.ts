import { describe, expect, it } from 'vitest'
import { limitBreach } from './limits'

const summary = { fileCount: 10, sourceFileCount: 5, totalBytes: 100, languages: {} }

describe('limitBreach', () => {
  it('passes a repo at the caps', () => {
    expect(limitBreach(summary, { maxFiles: 10, maxBytes: 100 })).toBeUndefined()
  })

  it('reports the file metric first when both caps are exceeded', () => {
    expect(limitBreach(summary, { maxFiles: 1, maxBytes: 1 })).toEqual({
      metric: 'files',
      value: 10,
      limit: 1,
    })
  })

  it('reports the byte metric when only bytes exceed', () => {
    expect(limitBreach(summary, { maxFiles: 10, maxBytes: 99 })).toEqual({
      metric: 'bytes',
      value: 100,
      limit: 99,
    })
  })
})
