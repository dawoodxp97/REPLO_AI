import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ANALYZER_VERSION, createAnalyzer, type Analysis } from '@replo/repo-analysis'
import { z } from 'zod'
import { findRegressions, type Regression } from './baseline'
import type { CourseArtifact } from './course-artifact'
import { scoreCourse, type CourseMetrics } from './course-score'
import { average, scoreIndex, type IndexMetrics } from './index-score'
import { fixtureRoot, readRepo } from './fixtures'
import { decideAllowList, type AllowListDecision } from './gate'
import { probePrompt, scoreProbe, type Completer, type ProbeScore } from './probe'
import type { SnapshotFacts } from './snapshot'
import {
  summarizeCourse,
  summarizeProbe,
  type CourseSummary,
  type ModelEvaluation,
  type ProbeSummary,
} from './summary'
import { TruthSheet } from './truth-sheet'

type Sheet = z.infer<typeof TruthSheet>

export const EVAL_RUN_VERSION = 'eval-2'

export interface IndexRun {
  sheet: Sheet
  metrics: IndexMetrics
  files: string[]
  framework: string | null
  snapshot: SnapshotFacts
}

export interface IndexSuite {
  pipelineVersion: string
  repos: { repo: string; metrics: IndexMetrics }[]
  mean: IndexMetrics
  runs: IndexRun[]
}

export interface ProbeRun {
  summary: ProbeSummary
  scores: { repo: string; score: ProbeScore }[]
}

export interface CourseRun {
  summary: CourseSummary
  scores: { repo: string; metrics: CourseMetrics }[]
}

export interface EvalReport {
  pipelineVersion: string
  index: Omit<IndexSuite, 'runs'>
  models: ModelEvaluation[]
  decision: AllowListDecision
  regressions: Regression[]
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
      metrics,
      files: input.files.map((file) => file.path),
      framework: analysis.framework,
      snapshot: snapshotOf(input.files, analysis),
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

export async function runProbes(index: IndexSuite, model: ModelUnderTest): Promise<ProbeRun> {
  const scores: { repo: string; score: ProbeScore }[] = []
  for (const run of index.runs) {
    const repo = run.sheet.repo.name
    const completion = await model.completerFor(repo)(
      probePrompt({ files: run.files, framework: run.framework, scripts: {} }),
    )
    scores.push({ repo, score: scoreProbe(run.sheet, run.files, completion) })
  }
  return {
    scores,
    summary: summarizeProbe(
      model.model,
      scores.map((entry) => entry.score),
    ),
  }
}

export interface CourseModelUnderTest {
  model: string
  artifacts: readonly CourseArtifact[]
}

export async function runCourses(
  index: IndexSuite,
  model: CourseModelUnderTest,
): Promise<CourseRun> {
  const byRepo = new Map(model.artifacts.map((artifact) => [artifact.repo, artifact]))
  if (byRepo.size !== model.artifacts.length)
    throw new Error(`${model.model}: duplicate course artifact for one repository`)
  const golden = new Set(index.runs.map((run) => run.sheet.repo.name))
  for (const repo of byRepo.keys())
    if (!golden.has(repo)) throw new Error(`${model.model}: unknown repository ${repo}`)
  const scores: { repo: string; metrics: CourseMetrics }[] = []
  for (const run of index.runs) {
    const repo = run.sheet.repo.name
    const artifact = byRepo.get(repo)
    if (!artifact) continue
    scores.push({ repo, metrics: scoreCourse(run.sheet, run.snapshot, artifact) })
  }
  return {
    scores,
    summary: summarizeCourse(
      model.model,
      index.runs.length,
      scores.map((entry) => entry.metrics),
    ),
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
  models: ModelEvaluation[]
  allowList: readonly string[]
  baseline: Record<string, IndexMetrics>
}): EvalReport {
  const { runs: _runs, ...index } = input.index
  return {
    pipelineVersion: `${input.index.pipelineVersion}+${EVAL_RUN_VERSION}`,
    index,
    models: input.models,
    decision: decideAllowList(input.allowList, input.models),
    regressions: findRegressions(metricsByRepo(index), input.baseline),
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

function snapshotOf(
  files: readonly { path: string; text: string }[],
  analysis: Analysis,
): SnapshotFacts {
  return {
    files: files.map((file) => ({
      path: file.path,
      blobSha: gitBlobSha(file.text),
      lineCount: file.text.split(/\r?\n/).length,
    })),
    symbols: analysis.symbols.map((symbol) => ({
      symbolKey: symbol.symbolKey,
      name: symbol.name,
      path: symbol.path,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
    })),
    edges: analysis.edges.map((edge) => ({
      fromPath: edge.fromPath,
      toPath: edge.toPath,
      kind: edge.kind,
    })),
  }
}

function gitBlobSha(text: string): string {
  return createHash('sha1')
    .update(`blob ${Buffer.byteLength(text)}\0`)
    .update(text)
    .digest('hex')
}
