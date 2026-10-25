import { z } from 'zod'
import { Audience, CommitSha } from '../common'

export const SourceRef = z.object({
  path: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  blobSha: z.string(),
  symbolKey: z.string().optional(),
})
export type SourceRef = z.infer<typeof SourceRef>

export const Evidence = z.object({ refId: z.string(), note: z.string().optional() })
export type Evidence = z.infer<typeof Evidence>

export const DiagramBlock = z.object({
  type: z.literal('diagram'),
  mermaid: z.string(),
  nodeRefs: z.record(z.string(), z.string()),
  caption: z.string(),
})
export type DiagramBlock = z.infer<typeof DiagramBlock>

export const Block = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prose'),
    md: z.string(),
    kind: z.enum(['observed', 'interpretation']),
    evidence: z.array(Evidence),
  }),
  z.object({
    type: z.literal('code'),
    refId: z.string(),
    highlight: z.array(z.tuple([z.number(), z.number()])).optional(),
    caption: z.string(),
  }),
  DiagramBlock,
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['note', 'warning', 'tip']),
    md: z.string(),
  }),
  z.object({
    type: z.literal('exercise'),
    prompt: z.string(),
    hints: z.array(z.string()),
    solutionRefs: z.array(z.string()),
  }),
])
export type Block = z.infer<typeof Block>

export const QuestionOption = z.object({ key: z.string().min(1), text: z.string().min(1) })
export type QuestionOption = z.infer<typeof QuestionOption>

export const Question = z
  .object({
    key: z.string(),
    kind: z.enum(['multiple_choice', 'true_false']),
    prompt: z.string(),
    options: z.array(QuestionOption).min(2).max(5),
    correct: z.string(),
    explanation: z.string(),
    evidence: z.array(Evidence).min(1),
  })
  .superRefine((question, ctx) => {
    const keys = question.options.map((option) => option.key)
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'option keys must be unique' })
    if (!keys.includes(question.correct))
      ctx.addIssue({ code: 'custom', path: ['correct'], message: 'correct must name an option' })
    if (question.kind === 'true_false' && question.options.length !== 2)
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'true/false takes two options' })
    if (question.kind === 'multiple_choice' && question.options.length < 3)
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'multiple choice takes three to five options',
      })
  })
export type Question = z.infer<typeof Question>

export const Lesson = z.object({
  key: z.string(),
  title: z.string(),
  minutes: z.number(),
  blocks: z.array(Block),
  quiz: z.array(Question).optional(),
})
export type Lesson = z.infer<typeof Lesson>

export const Chapter = z.object({
  key: z.string(),
  title: z.string(),
  summary: z.string(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  lessons: z.array(Lesson),
})
export type Chapter = z.infer<typeof Chapter>

export const Architecture = z.object({
  diagram: DiagramBlock,
  blocks: z.array(Block),
})
export type Architecture = z.infer<typeof Architecture>

export const CONTENT_SCHEMA_VERSION = 1

export const TutorialContent = z.object({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  meta: z.object({
    title: z.string(),
    repo: z.object({ owner: z.string(), name: z.string(), commitSha: CommitSha }),
    audience: Audience,
    objectives: z.array(z.string()),
    prerequisites: z.array(z.string()),
  }),
  architecture: Architecture.optional(),
  chapters: z.array(Chapter),
  sourceRefs: z.record(z.string(), SourceRef),
  furtherReading: z.array(z.object({ refId: z.string(), why: z.string() })),
  openQuestions: z.array(z.string()),
})
export type TutorialContent = z.infer<typeof TutorialContent>

export const ValidationReport = z.object({
  referenceValidity: z.number().min(0).max(1),
  verifiedClaimRatio: z.number().min(0).max(1),
  judgeScore: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  fabricatedIdentifiers: z.number().int().nonnegative(),
  repairs: z.number().int().nonnegative(),
  draft: z.boolean(),
  issues: z.array(
    z.object({ lessonKey: z.string().nullable(), code: z.string(), detail: z.string() }),
  ),
})
export type ValidationReport = z.infer<typeof ValidationReport>
