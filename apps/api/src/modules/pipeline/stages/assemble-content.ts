import {
  CONTENT_SCHEMA_VERSION,
  TutorialContent,
  type Audience,
  type DiagramBlock,
  type SourceRef,
} from '@replo/contracts'
import type { ArchitectureDraft, OutlineDraft } from '../drafts'
import type { GroundedDraft, GroundedTutorial } from './ground-chapters'

const MAX_OPEN_QUESTIONS = 12

export interface ContentInputs {
  repo: { owner: string; name: string; commitSha: string }
  audience: Audience
  outline: OutlineDraft
  architecture: ArchitectureDraft
  diagram: DiagramBlock | undefined
  grounded: GroundedTutorial
}

export function assembleContent(inputs: ContentInputs): TutorialContent {
  const { repo, audience, outline, architecture, diagram, grounded } = inputs
  const { overview, chapters } = grounded
  return TutorialContent.parse({
    schemaVersion: CONTENT_SCHEMA_VERSION,
    meta: {
      title: outline.title,
      repo,
      audience,
      objectives: outline.objectives,
      prerequisites: outline.prerequisites,
    },
    architecture: diagram ? { diagram, blocks: overview.grounded.lesson.blocks } : undefined,
    chapters: chapters.map((chapter) => ({
      key: chapter.spec.key,
      title: chapter.spec.title,
      summary: chapter.spec.summary,
      objectives: chapter.spec.objectives,
      prerequisites: chapter.spec.prerequisites,
      lessons: chapter.lessons.map((entry) => entry.grounded.lesson),
    })),
    sourceRefs: mergedRefs([overview, ...chapters.flatMap((chapter) => chapter.lessons)]),
    furtherReading: [],
    openQuestions: uniqueQuestions([
      ...architecture.openQuestions,
      ...chapters.flatMap((chapter) => chapter.openQuestions),
    ]),
  })
}

function mergedRefs(entries: readonly GroundedDraft[]): Record<string, SourceRef> {
  return Object.fromEntries(entries.flatMap((entry) => Object.entries(entry.grounded.refs)))
}

function uniqueQuestions(questions: readonly string[]): string[] {
  const cleaned = questions
    .map((question) => question.trim())
    .filter((question) => question.length > 0)
  return [...new Set(cleaned)].slice(0, MAX_OPEN_QUESTIONS)
}
