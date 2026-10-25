import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { findRegressions } from './baseline'
import { decideAllowList } from './gate'
import type { IndexMetrics } from './index-score'
import { loadTruthSheets, recordedCompleterFor, runIndexSuite, runProbes } from './runner'

const HERE = fileURLToPath(new URL('..', import.meta.url))

describe('smoke suite on the golden set', () => {
  it('loads ten truth sheets, each with ten facts', async () => {
    const sheets = await loadTruthSheets(join(HERE, 'golden'))
    expect(sheets).toHaveLength(10)
    expect(sheets.every((sheet) => sheet.facts.length === 10)).toBe(true)
  })

  it('finds no index regression against the committed baseline', async () => {
    const sheets = await loadTruthSheets(join(HERE, 'golden'))
    const index = await runIndexSuite(sheets)
    const baseline = JSON.parse(
      await readFile(join(HERE, 'baseline', 'index.json'), 'utf8'),
    ) as Record<string, IndexMetrics>
    const current = Object.fromEntries(index.repos.map((entry) => [entry.repo, entry.metrics]))
    expect(findRegressions(current, baseline)).toEqual([])
  })

  it('gates the recorded good model in and the recorded weak model out', async () => {
    const sheets = await loadTruthSheets(join(HERE, 'golden'))
    const index = await runIndexSuite(sheets)
    const good = await runProbes(index, {
      model: 'recorded/model-good',
      completerFor: recordedCompleterFor(join(HERE, 'recorded/model-good')),
    })
    const weak = await runProbes(index, {
      model: 'recorded/model-weak',
      completerFor: recordedCompleterFor(join(HERE, 'recorded/model-weak')),
    })
    expect(decideAllowList([], [good.summary, weak.summary]).enter).toEqual(['recorded/model-good'])
    expect(weak.summary.referenceValidityPre).toBe(0)
  })
})
