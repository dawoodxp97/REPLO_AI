import { describe, expect, it, vi } from 'vitest'
import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import type { StageDeps } from '../stage-deps'
import { runPublish } from './publish'

describe('runPublish', () => {
  it('clears stage outputs when the job was already published', async () => {
    const clear = vi.fn(async () => undefined)
    const read = vi.fn()
    const deps = {
      tutorials: { versionForJob: vi.fn(async () => ({ id: 'version' })) },
      outputs: { clear, read },
    } as unknown as StageDeps
    const ctx = { job: { id: 'job-1' } } as unknown as StageContext

    await runPublish(deps, ctx)

    expect(clear).toHaveBeenCalledExactlyOnceWith('job-1')
    expect(read).not.toHaveBeenCalled()
  })
})
