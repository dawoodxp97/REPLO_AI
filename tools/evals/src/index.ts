import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { loadCourseArtifacts } from './course-artifact'
import { gateFailures } from './gate'
import { IndexMetricsSchema } from './index-score'
import {
  buildReport,
  loadTruthSheets,
  metricsByRepo,
  recordedCompleterFor,
  runCourses,
  runIndexSuite,
  runProbes,
  writeJson,
  type IndexSuite,
} from './runner'
import type { ModelEvaluation } from './summary'

const HERE = fileURLToPath(new URL('..', import.meta.url))
const GOLDEN = join(HERE, 'golden')
const BASELINE = join(HERE, 'baseline', 'index.json')
const OUT = join(HERE, 'out')
const RECORDED_MODELS = [
  { path: 'recorded/model-good', expectation: 'admitted' },
  { path: 'recorded/model-weak', expectation: 'rejected' },
] as const
type RecordedModel = {
  path: string
  expectation?: (typeof RECORDED_MODELS)[number]['expectation']
}
const Baseline = z.record(z.string(), IndexMetricsSchema)

async function writeBaseline(index: IndexSuite) {
  await writeJson(BASELINE, metricsByRepo(index))
  console.log(`baseline written for ${index.repos.length} repos`)
}

async function evaluate(index: IndexSuite, model: string): Promise<ModelEvaluation> {
  const probe = await runProbes(index, {
    model,
    completerFor: recordedCompleterFor(join(HERE, model)),
  })
  const course = await runCourses(index, {
    model,
    artifacts: await loadCourseArtifacts(join(HERE, model, 'course')),
  })
  return {
    model,
    probe: probe.summary,
    course: course.summary,
    probeScores: probe.scores,
    courseScores: course.scores,
  }
}

async function printReport(index: IndexSuite, modelsToRun: readonly RecordedModel[]) {
  const baseline = Baseline.parse(JSON.parse(await readFile(BASELINE, 'utf8')))
  const models: ModelEvaluation[] = []
  for (const model of modelsToRun) models.push(await evaluate(index, model.path))

  const report = buildReport({ index, models, allowList: [], baseline })
  const path = join(OUT, 'report.json')
  await writeJson(path, report)
  console.log(`${index.repos.length} repos, pipeline ${report.pipelineVersion}`)
  console.log(
    `index mean entryRecall ${report.index.mean.entryRecall.toFixed(3)} routeRecall ${report.index.mean.routeRecall.toFixed(3)} importRecall ${report.index.mean.importRecall.toFixed(3)}`,
  )
  for (const model of report.models) {
    if (model.probe)
      console.log(
        `${model.model}: probe schema ${model.probe.schemaValidRate.toFixed(2)} refs ${model.probe.referenceValidityPre.toFixed(2)} entryRecall ${model.probe.entryRecall.toFixed(2)} fabricated/call ${model.probe.fabricatedPerCall.toFixed(2)}`,
      )
    if (model.course)
      console.log(
        `${model.model}: course coverage ${model.course.graphCoverage.toFixed(2)} citations ${model.course.citationValidity.toFixed(2)} diagrams ${model.course.diagramValidity.toFixed(2)} coherence ${model.course.courseCoherence.toFixed(2)} quiz ${model.course.quizQuality.toFixed(2)}`,
      )
  }
  console.log(
    `allow-list decision (dry run, recorded answers only): enter ${report.decision.enter.join(', ') || '-'}, leave ${report.decision.leave.join(', ') || '-'}`,
  )
  console.log(`report: ${path}`)

  let gateFailed = false
  for (const [position, model] of report.models.entries()) {
    const failures = gateFailures(model)
    const expectation = modelsToRun[position]?.expectation
    const admitted = failures.length === 0
    if (expectation === 'admitted' && !admitted)
      failures.forEach((failure) => console.error(`${model.model} failed the gate: ${failure}`))
    if (expectation === 'rejected' && admitted)
      console.error(`${model.model} was expected to fail the gate but passed`)
    if (expectation !== undefined && admitted !== (expectation === 'admitted')) gateFailed = true
  }
  for (const regression of report.regressions)
    console.error(
      `regression ${regression.repo} ${regression.metric} ${regression.current} < ${regression.baseline}`,
    )
  if (report.regressions.length > 0) process.exitCode = 1
  if (gateFailed) process.exitCode = 1
  if (report.decision.leave.length > 0) process.exitCode = 1
}

async function main() {
  const index = await runIndexSuite(await loadTruthSheets(GOLDEN))
  if (process.argv.includes('--write-baseline')) {
    await writeBaseline(index)
    return
  }
  await printReport(index, modelsFromArgs(process.argv))
}

function modelsFromArgs(argv: readonly string[]): readonly RecordedModel[] {
  const position = argv.indexOf('--models')
  const value = position < 0 ? undefined : argv[position + 1]
  if (value === undefined || value.startsWith('--')) return RECORDED_MODELS
  return value
    .split(',')
    .map((path) => path.trim())
    .filter((path) => path.length > 0)
    .map((path) => ({ path }))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
