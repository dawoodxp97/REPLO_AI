import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ANALYZER_VERSION, createAnalyzer, type Analysis } from '@replo/repo-analysis'
import { z } from 'zod'
import { findRegressions, type Regression } from './baseline'
import { average, mean, scoreIndex, type IndexMetrics } from './index-score'
import { fixtureRoot, readRepo } from './fixtures'
import { decideAllowList, type AllowListDecision, type ModelSummary } from './gate'
import { probePrompt, scoreProbe, type Completer, type ProbeScore } from './probe'
import { PIPELINE_METRICS, TruthSheet } from './truth-sheet'

type Sheet = z.infer<typeof TruthSheet>

export const EVAL_RUN_VERSION = 'eval-1'

export interface IndexRun {
  sheet: Sheet
  analysis: Analysis
  metrics: IndexMetrics
  files: string[]
  framework: string | null
}

export interface IndexSuite {
  pipelineVersion: string
  repos: { repo: string; metrics: IndexMetrics }[]
  mean: IndexMetrics
  runs: IndexRun[]
}

export interface ModelRun {
  model: string
  summary: ModelSummary
  scores: { repo: string; score: ProbeScore }[]
}

export interface EvalReport {
  pipelineVersion: string
  index: Omit<IndexSuite, 'runs'>
  models: ModelRun[]
  decision?: AllowListDecision
  regressions: Regression[]
  notMeasured: readonly string[]
}

const RecordedAnswer = z.object({ output: z.unknown() })

export async function loadTruthSheets(goldenDir: string): Promise<Sheet[]> {
  const names = (await readdir(goldenDir)).filter((file) => file.endsWith('.truth.json')).sort()
  return Promise.all(
    names.map(async (name) =>
      TruthSheet.parse(JSON.parse(await readFile(join(goldenDir, name), 'utf8'))),
    ),
  )
}

export async function runIndexSuite(sheets: readonly Sheet[]): Promise<IndexSuite> {
  const analyzer = await createAnalyzer()
  const runs: IndexRun[] = []
  const repos: IndexSuite['repos'] = []
  for (const sheet of sheets) {
    if (sheet.source.kind !== 'fixture')
      throw new Error(`${sheet.repo.name}: only fixture sources run offline`)
    const input = await readRepo(fixtureRoot(sheet.source.path))
    const session = analyzer.start(input.options)
    for (const file of input.files) session.addFile(file)
    const analysis = session.finish()
    const metrics = scoreIndex(sheet.index, analysis)
    runs.push({
      sheet,
      analysis,
      metrics,
      files: input.files.map((file) => file.path),
      framework: analysis.framework,
    })
    repos.push({ repo: sheet.repo.name, metrics })
  }
  return {
    pipelineVersion: `analyzer-${ANALYZER_VERSION}`,
    repos,
    mean: average(repos.map((entry) => entry.metrics)),
    runs,
  }
}

export interface ModelUnderTest {
  model: string
  completerFor: (repo: string) => Completer
}

export async function runProbes(index: IndexSuite, model: ModelUnderTest): Promise<ModelRun> {
  const scores: { repo: string; score: ProbeScore }[] = []
  for (const run of index.runs) {
    const repo = run.sheet.repo.name
    const completion = await model.completerFor(repo)(
      probePrompt({ files: run.files, framework: run.framework, scripts: {} }),
    )
    scores.push({ repo, score: scoreProbe(run.sheet, run.files, completion) })
  }
  return {
    model: model.model,
    scores,
    summary: {
      model: model.model,
      calls: scores.length,
      schemaValidRate: mean(scores.map((entry) => entry.score.schemaValid)),
      referenceValidityPre: mean(scores.map((entry) => entry.score.referenceValidityPre)),
      entryRecall: mean(scores.map((entry) => entry.score.entryRecall)),
      fabricatedPerCall: mean(scores.map((entry) => entry.score.fabricatedPaths)),
      costUsd: scores.reduce((sum, entry) => sum + entry.score.costUsd, 0),
      latencyMs: mean(scores.map((entry) => entry.score.latencyMs)),
    },
  }
}

export function recordedCompleterFor(recordedDir: string) {
  return (repo: string): Completer =>
    async () => {
      const answer = RecordedAnswer.parse(
        JSON.parse(await readFile(join(recordedDir, `${repo}.json`), 'utf8')),
      )
      return { output: answer.output, latencyMs: 0, costUsd: 0 }
    }
}

export function metricsByRepo(suite: Pick<IndexSuite, 'repos'>): Record<string, IndexMetrics> {
  return Object.fromEntries(suite.repos.map((entry) => [entry.repo, entry.metrics]))
}

export function buildReport(input: {
  index: IndexSuite
  models: ModelRun[]
  allowList: readonly string[]
  baseline: Record<string, IndexMetrics>
}): EvalReport {
  const { runs: _runs, ...index } = input.index
  const measured = new Set(input.models.flatMap((model) => Object.keys(model.summary)))
  return {
    pipelineVersion: `${input.index.pipelineVersion}+${EVAL_RUN_VERSION}`,
    index,
    models: input.models,
    decision:
      input.models.length > 0
        ? decideAllowList(
            input.allowList,
            input.models.map((model) => model.summary),
          )
        : undefined,
    regressions: findRegressions(metricsByRepo(index), input.baseline),
    notMeasured: PIPELINE_METRICS.filter((metric) => !measured.has(metric)),
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}
