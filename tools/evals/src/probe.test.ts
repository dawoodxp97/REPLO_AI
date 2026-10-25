import { describe, expect, it } from 'vitest'
import type { TruthSheet } from './truth-sheet'
import { probePrompt, scoreProbe } from './probe'

const truth = {
  entryPoints: ['src/server.ts', 'src/cli.ts'],
  index: { routes: [{ method: 'GET', pattern: '/health', path: 'src/server.ts' }] },
} as unknown as TruthSheet

const files = ['src/server.ts', 'src/cli.ts', 'package.json']
const completion = (output: unknown) => ({ output, latencyMs: 12, costUsd: 0.01 })

describe('probePrompt', () => {
  it('shows the file list and never the truth sheet', () => {
    const prompt = probePrompt({
      files,
      framework: 'Express',
      scripts: { start: 'node dist/server.js' },
    })
    expect(prompt.user).toContain('src/server.ts')
    expect(prompt.user).toContain('framework: Express')
    expect(prompt.user).not.toContain('Ground')
  })

  it('caps the listing at 400 files and says so', () => {
    const many = Array.from({ length: 500 }, (_, i) => `f${i}.ts`)
    expect(probePrompt({ files: many, framework: null, scripts: {} }).user).toContain(
      'first 400 shown',
    )
  })
})

describe('scoreProbe', () => {
  it('scores a perfect answer as full recall and full reference validity', () => {
    const score = scoreProbe(
      truth,
      files,
      completion({
        entryPoints: ['src/server.ts', 'src/cli.ts'],
        routes: [{ method: 'GET', pattern: '/health', path: 'src/server.ts' }],
      }),
    )
    expect(score).toMatchObject({
      schemaValid: 1,
      referenceValidityPre: 1,
      entryRecall: 1,
      routeRecall: 1,
      fabricatedPaths: 0,
    })
  })

  it('counts a path that is not in the file list as fabricated', () => {
    const score = scoreProbe(
      truth,
      files,
      completion({ entryPoints: ['src/server.ts', 'src/made-up.ts'], routes: [] }),
    )
    expect(score.fabricatedPaths).toBe(1)
    expect(score.referenceValidityPre).toBe(0.5)
    expect(score.entryRecall).toBe(0.5)
  })

  it('scores an answer that breaks the schema as failed on every metric', () => {
    const score = scoreProbe(truth, files, completion({ entryPoints: 'src/server.ts' }))
    expect(score).toMatchObject({
      schemaValid: 0,
      referenceValidityPre: 0,
      entryRecall: 0,
      routeRecall: 0,
    })
  })

  it('keeps latency and cost from the call', () => {
    expect(scoreProbe(truth, files, completion({ entryPoints: [], routes: [] }))).toMatchObject({
      latencyMs: 12,
      costUsd: 0.01,
    })
  })
})
