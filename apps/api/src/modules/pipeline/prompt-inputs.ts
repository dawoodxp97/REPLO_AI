import { JobError } from '../../worker/errors'
import type { CourseGraph, Tour } from '@replo/contracts'
import type { IndexingService, SnapshotView } from '../indexing/indexing.service'
import type { LessonDraft, OutlineDraft } from './drafts'
import { normalisePath } from './grounding/evidence'
import { SourceIndex } from './grounding/source-index'
import { groupSizes } from './grounding/structure'
import { rankedFiles } from './graph'
import { dataSection } from './prompts'

const MAP_FILES = 60
const MAP_SYMBOLS = 8
const MAP_GROUPS = 20
const PROMPT_EDGES = 240
const EXCERPT_CHARS = 8000
const EXCERPT_FILES = 12
const BACKFILL_PATHS = 3
export const FALLBACK_FILES = 12

export function sourceIndexOf(
  view: SnapshotView,
  indexing: IndexingService,
  snapshotId: string,
): SourceIndex {
  return new SourceIndex(
    {
      files: view.files,
      symbols: view.symbols,
      edges: view.edges,
      dependencies: view.dependencies,
    },
    (path) => indexing.readText(snapshotId, path),
  )
}

export function rankedPaths(view: SnapshotView, limit: number): string[] {
  return rankedFiles(view)
    .slice(0, limit)
    .map((entry) => entry.path)
}

export function repoMap(
  view: SnapshotView,
  index: SourceIndex,
  summaries: Readonly<Record<string, string>>,
): string {
  const groups = [...groupSizes(view.files).entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAP_GROUPS)
    .map(([name, count]) => `- ${name} (${count} files)`)

  const files = rankedPaths(view, MAP_FILES).map((path) => {
    const summary = summaries[path]
    const exported = index
      .symbolsIn(path)
      .filter((symbol) => symbol.exported)
      .slice(0, MAP_SYMBOLS)
      .map((symbol) => `    - ${symbol.symbolKey} (${symbol.kind})`)
    return [`- ${path}${summary ? `: ${summary}` : ''}`, ...exported].join('\n')
  })

  const entries = (view.analysis?.entryPoints ?? []).map(
    (entry) => `- ${entry.path} (${entry.kind}): ${entry.reason}`,
  )
  const routes = (view.analysis?.routes ?? []).map(
    (route) => `- ${route.method} ${route.pattern} -> ${route.path}`,
  )

  return [
    `Framework: ${view.analysis?.framework ?? 'none detected'}`,
    `Dependencies: ${view.dependencies.length}`,
    'Groups:',
    ...groups,
    'Entry points:',
    ...(entries.length > 0 ? entries : ['- none found']),
    'Routes:',
    ...(routes.length > 0 ? routes : ['- none found']),
    'Files by importance:',
    ...files,
  ].join('\n')
}

export function excerptsFor(index: SourceIndex, paths: readonly string[]): string {
  return paths
    .slice(0, EXCERPT_FILES)
    .flatMap((path) => {
      const lines = index.lines(path)
      if (!lines) return []
      const symbols = index
        .symbolsIn(path)
        .map(
          (symbol) =>
            `- ${symbol.symbolKey} (${symbol.kind}${symbol.exported ? ', exported' : ''})`,
        )
      return [
        `FILE ${path}`,
        'SYMBOLS',
        ...(symbols.length > 0 ? symbols : ['- none']),
        'TEXT',
        lines.join('\n').slice(0, EXCERPT_CHARS),
        '',
      ]
    })
    .join('\n')
}

export function focusPathsOf(lessons: readonly { focusPaths: readonly string[] }[]): string[] {
  return [...new Set(lessons.flatMap((lesson) => lesson.focusPaths))]
}

export function draftPaths(lesson: LessonDraft): string[] {
  const fromBlocks = lesson.blocks.flatMap((block) => {
    switch (block.type) {
      case 'prose':
        return block.evidence.map((item) => item.path)
      case 'code':
        return [block.source.path]
      case 'diagram':
        return Object.values(block.nodeRefs)
      default:
        return []
    }
  })
  const fromQuiz = lesson.quiz.flatMap((question) => question.evidence.map((item) => item.path))
  return [...fromBlocks, ...fromQuiz]
}

export function normaliseOutline(
  draft: OutlineDraft,
  index: SourceIndex,
  maxChapters: number,
  fallbackPaths: readonly string[],
): OutlineDraft {
  const chapterKeys = new Set<string>()
  const lessonKeys = new Set<string>()
  const chapters = draft.chapters.slice(0, maxChapters).map((chapter) => {
    const resolved = chapter.lessons.map((lesson) => existingPaths(lesson.focusPaths, index))
    const siblingPaths = [...new Set(resolved.flat())]
    const backfill = (
      siblingPaths.length > 0 ? siblingPaths : existingPaths(fallbackPaths, index)
    ).slice(0, BACKFILL_PATHS)
    if (backfill.length === 0 && resolved.some((paths) => paths.length === 0))
      throw new JobError('OUTLINE_INVALID', false, 'the outline names no file in this repository')

    return {
      ...chapter,
      key: uniqueKey(chapter.key, chapterKeys),
      lessons: chapter.lessons.map((lesson, position) => {
        const own = resolved[position] ?? []
        const focusPaths = own.length > 0 ? own : backfill
        return {
          ...lesson,
          key: uniqueKey(lessonKeyFor(focusPaths, position), lessonKeys),
          focusPaths,
        }
      }),
    }
  })
  return { ...draft, chapters }
}

function lessonKeyFor(focusPaths: readonly string[], position: number): string {
  const primary = focusPaths[0]
  if (!primary) return `lesson-${position + 1}`
  const base = primary
    .replace(/\.[^./]+$/, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? base : `lesson-${position + 1}`
}

export function fallbackFocusPaths(view: SnapshotView, index: SourceIndex): string[] {
  return existingPaths(rankedPaths(view, FALLBACK_FILES), index).slice(0, BACKFILL_PATHS)
}

function existingPaths(paths: readonly string[], index: SourceIndex): string[] {
  const found = paths.flatMap((path) => {
    const normal = normalisePath(path)
    return normal !== undefined && index.file(normal) !== undefined ? [normal] : []
  })
  return [...new Set(found)]
}

export function dataFiles(index: SourceIndex, paths: readonly string[]): string {
  return dataSection('files', excerptsFor(index, paths))
}

export function graphSection(graph: CourseGraph): string {
  const nodes = graph.nodes
    .map((node) => {
      const facts = [node.kind, node.layer, node.domain].filter(Boolean).join(', ')
      return `- ${node.id} (${facts})${node.label && node.label !== node.id ? `: ${node.label}` : ''}`
    })
    .slice(0, 200)
  const edges = graph.edges
    .slice(0, PROMPT_EDGES)
    .map((edge) => `- ${edge.from} -> ${edge.to} (${edge.kind})`)
  return dataSection(
    'graph',
    ['Nodes:', ...nodes, 'Edges:', ...(edges.length > 0 ? edges : ['- none'])].join('\n'),
  )
}

export function toursSection(tours: readonly Tour[]): string {
  const body = tours.flatMap((tour) => [
    `TOUR ${tour.key}: ${tour.title} — ${tour.objective}`,
    ...tour.steps.map((step, position) => `  ${position + 1}. ${step.title} (${step.nodeId ?? '—'})`),
  ])
  return dataSection('tours', body.join('\n'))
}

function uniqueKey(key: string, taken: Set<string>): string {
  let candidate = key
  for (let suffix = 2; taken.has(candidate); suffix++) candidate = `${key}-${suffix}`
  taken.add(candidate)
  return candidate
}
