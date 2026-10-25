import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { IndexMetricsSchema } from './index-score'
import {
  buildReport,
  loadTruthSheets,
  metricsByRepo,
  recordedCompleterFor,
  runIndexSuite,
  runProbes,
  writeJson,
  type IndexSuite,
  type ModelRun,
} from './runner'

const HERE = fileURLToPath(new URL('..', import.meta.url))
const GOLDEN = join(HERE, 'golden')
const BASELINE = join(HERE, 'baseline', 'index.json')
const OUT = join(HERE, 'out')
const RECORDED_MODELS = ['recorded/model-good', 'recorded/model-weak']
const Baseline = z.record(z.string(), IndexMetricsSchema)

async function writeBaseline(index: IndexSuite) {
  await writeJson(BASELINE, metricsByRepo(index))
  console.log(`baseline written for ${index.repos.length} repos`)
}

async function printReport(index: IndexSuite) {
  const baseline = Baseline.parse(JSON.parse(await readFile(BASELINE, 'utf8')))
  const models: ModelRun[] = []
  for (const model of RECORDED_MODELS) {
    models.push(
      await runProbes(index, {
        model,
        completerFor: recordedCompleterFor(join(HERE, model)),
      }),
    )
  }

  const report = buildReport({ index, models, allowList: [], baseline })
  const path = join(OUT, 'report.json')
  await writeJson(path, report)
  console.log(`${index.repos.length} repos, pipeline ${report.pipelineVersion}`)
  console.log(
    `index mean entryRecall ${report.index.mean.entryRecall.toFixed(3)} routeRecall ${report.index.mean.routeRecall.toFixed(3)} importRecall ${report.index.mean.importRecall.toFixed(3)}`,
  )
  for (const model of report.models) {
    console.log(
      `${model.model}: schema ${model.summary.schemaValidRate.toFixed(2)} refs ${model.summary.referenceValidityPre.toFixed(2)} entryRecall ${model.summary.entryRecall.toFixed(2)} fabricated/call ${model.summary.fabricatedPerCall.toFixed(2)}`,
    )
  }
  if (report.decision)
    console.log(
      `allow-list decision (dry run, recorded answers only): enter ${report.decision.enter.join(', ') || '-'}, leave ${report.decision.leave.join(', ') || '-'}`,
    )
  console.log(`report: ${path}`)
  for (const regression of report.regressions)
    console.error(
      `regression ${regression.repo} ${regression.metric} ${regression.current} < ${regression.baseline}`,
    )
  if (report.regressions.length > 0) process.exitCode = 1
}

async function main() {
  const index = await runIndexSuite(await loadTruthSheets(GOLDEN))
  if (process.argv.includes('--write-baseline')) await writeBaseline(index)
  else await printReport(index)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
