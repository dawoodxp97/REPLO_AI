import { z } from 'zod'

const text = (max: number) => z.string().min(1).max(max)

export const EvidenceDraft = z.object({
  path: text(512),
  symbol: text(512).optional(),
  quote: text(400).optional(),
})
export type EvidenceDraft = z.infer<typeof EvidenceDraft>

const ProseDraft = z.object({
  type: z.literal('prose'),
  kind: z.enum(['observed', 'interpretation']),
  md: text(4000),
  evidence: z.array(EvidenceDraft).max(6),
})

const CalloutDraft = z.object({
  type: z.literal('callout'),
  tone: z.enum(['note', 'warning', 'tip']),
  md: text(1000),
})

export const BlockDraft = z.discriminatedUnion('type', [
  ProseDraft,
  z.object({
    type: z.literal('code'),
    source: EvidenceDraft,
    caption: text(300),
  }),
  z.object({
    type: z.literal('diagram'),
    mermaid: text(4000),
    nodeRefs: z.record(text(32), text(512)),
    caption: text(300),
  }),
  CalloutDraft,
  z.object({
    type: z.literal('exercise'),
    prompt: text(1000),
    hints: z.array(text(300)).max(3),
  }),
])
export type BlockDraft = z.infer<typeof BlockDraft>

export const QuestionDraft = z.object({
  key: text(64),
  kind: z.enum(['multiple_choice', 'true_false']),
  prompt: text(500),
  options: z
    .array(z.object({ key: text(16), text: text(300) }))
    .min(2)
    .max(5),
  correct: text(16),
  explanation: text(600),
  evidence: z.array(EvidenceDraft).min(1).max(4),
})
export type QuestionDraft = z.infer<typeof QuestionDraft>

const LessonHeader = z.object({
  key: text(64),
  title: text(160),
  minutes: z.number().int().min(1).max(60),
})

export const LessonDraft = LessonHeader.extend({
  blocks: z.array(BlockDraft).min(1).max(12),
  quiz: z.array(QuestionDraft).max(5),
})
export type LessonDraft = z.infer<typeof LessonDraft>

export const ChapterDraft = z.object({
  lessons: z.array(LessonDraft).min(1).max(4),
  openQuestions: z.array(text(300)).max(5),
})
export type ChapterDraft = z.infer<typeof ChapterDraft>

const OutlineLessonDraft = LessonHeader.extend({
  focusPaths: z.array(text(512)).max(8),
})

export const OutlineChapterDraft = z.object({
  key: text(64),
  title: text(160),
  summary: text(600),
  objectives: z.array(text(300)).min(1).max(6),
  prerequisites: z.array(text(300)).max(4),
  lessons: z.array(OutlineLessonDraft).min(1).max(4),
})
export type OutlineChapterDraft = z.infer<typeof OutlineChapterDraft>

export const OutlineDraft = z.object({
  title: text(160),
  objectives: z.array(text(300)).min(1).max(8),
  prerequisites: z.array(text(300)).max(6),
  chapters: z.array(OutlineChapterDraft).min(3).max(8),
})
export type OutlineDraft = z.infer<typeof OutlineDraft>

export const ArchitectureDraft = z.object({
  blocks: z
    .array(z.discriminatedUnion('type', [ProseDraft, CalloutDraft]))
    .min(1)
    .max(8),
  openQuestions: z.array(text(300)).max(5),
})
export type ArchitectureDraft = z.infer<typeof ArchitectureDraft>

export const ArchitectureAndOutlineDraft = z.object({
  architecture: ArchitectureDraft,
  outline: OutlineDraft,
})
export type ArchitectureAndOutlineDraft = z.infer<typeof ArchitectureAndOutlineDraft>

export const SummariesDraft = z.object({
  files: z
    .array(
      z.object({
        path: text(512),
        summary: text(300),
      }),
    )
    .max(64),
})
export type SummariesDraft = z.infer<typeof SummariesDraft>

export const JudgeDraft = z.object({
  score: z.number().min(0).max(1),
  issues: z.array(text(300)).max(5),
})
export type JudgeDraft = z.infer<typeof JudgeDraft>
