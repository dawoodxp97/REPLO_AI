import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { findRegressions } from './baseline'
import { loadCourseArtifacts } from './course-artifact'
import { decideAllowList, gateFailures } from './gate'
import type { IndexMetrics } from './index-score'
import {
  loadTruthSheets,
  recordedCompleterFor,
  runCourses,
  runIndexSuite,
  runProbes,
} from './runner'
import type { ModelEvaluation } from './summary'

const HERE = fileURLToPath(new URL('..', import.meta.url))

async function evaluate(model: string): Promise<ModelEvaluation> {
  const sheets = await loadTruthSheets(join(HERE, 'golden'))
  const index = await runIndexSuite(sheets)
  const probe = await runProbes(index, {
    model,
    completerFor: recordedCompleterFor(join(HERE, model)),
  })
  const course = await runCourses(index, {
    model,
    artifacts: await loadCourseArtifacts(join(HERE, model, 'course')),
  })
  return { model, probe: probe.summary, course: course.summary }
}

describe('smoke suite on the golden set', () => {
  it('loads thirteen truth sheets, each with ten facts', async () => {
    const sheets = await loadTruthSheets(join(HERE, 'golden'))
    expect(sheets).toHaveLength(13)
    expect(sheets.every((sheet) => sheet.facts.length === 10)).toBe(true)
    expect(new Set(sheets.map((sheet) => sheet.size))).toEqual(
      new Set(['small', 'medium', 'large']),
    )
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

  it('admits the recorded good model and rejects the recorded weak model', async () => {
    const good = await evaluate('recorded/model-good')
    const weak = await evaluate('recorded/model-weak')

    expect(gateFailures(good)).toEqual([])
    expect(gateFailures(weak).length).toBeGreaterThan(0)
    expect(good.course?.citationValidity).toBe(1)
    expect(good.course?.diagramValidity).toBe(1)
    expect(weak.course?.citationValidity).toBeLessThan(1)
    expect(weak.course?.diagramValidity).toBeLessThan(1)
    expect(weak.course?.graphCoverage).toBeLessThan(1)
    expect(decideAllowList([], [good, weak]).enter).toEqual(['recorded/model-good'])
  })
})
