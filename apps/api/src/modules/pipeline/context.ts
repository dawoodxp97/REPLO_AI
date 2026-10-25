import type { IndexingService, SnapshotView } from '../indexing/indexing.service'
import type { LessonDraft, OutlineDraft } from './drafts'
import { normalisePath } from './grounding/evidence'
import { SourceIndex } from './grounding/source-index'
import { groupOf } from './grounding/structure'
import { dataSection } from './prompts'

const MAP_FILES = 60
const MAP_SYMBOLS = 8
const MAP_GROUPS = 20
const EXCERPT_CHARS = 8000
const EXCERPT_FILES = 12

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
  return view.files
    .map((file) => ({ path: file.path, rank: view.analysis?.metrics[file.path]?.pageRank ?? 0 }))
    .sort((a, b) => b.rank - a.rank || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((entry) => entry.path)
}

export function repoMap(
  view: SnapshotView,
  index: SourceIndex,
  summaries: Readonly<Record<string, string>>,
): string {
  const sizes = new Map<string, number>()
  for (const file of view.files) {
    const group = groupOf(file.path)
    if (group) sizes.set(group, (sizes.get(group) ?? 0) + 1)
  }
  const groups = [...sizes.entries()]
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
): OutlineDraft {
  const chapterKeys = new Set<string>()
  const lessonKeys = new Set<string>()
  const chapters = draft.chapters.slice(0, maxChapters).map((chapter) => ({
    ...chapter,
    key: uniqueKey(chapter.key, chapterKeys),
    lessons: chapter.lessons.map((lesson) => ({
      ...lesson,
      key: uniqueKey(lesson.key, lessonKeys),
      focusPaths: lesson.focusPaths.filter((path) => {
        const normal = normalisePath(path)
        return normal !== undefined && index.file(normal) !== undefined
      }),
    })),
  }))
  return { ...draft, chapters }
}

export function dataFiles(index: SourceIndex, paths: readonly string[]): string {
  return dataSection('files', excerptsFor(index, paths))
}

function uniqueKey(key: string, taken: Set<string>): string {
  let candidate = key
  for (let suffix = 2; taken.has(candidate); suffix++) candidate = `${key}-${suffix}`
  taken.add(candidate)
  return candidate
}
