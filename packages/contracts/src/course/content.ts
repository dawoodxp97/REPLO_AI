import { z } from 'zod'
import { Audience, CommitSha, NonNegativeInt } from '../common'

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

export const QuestionKind = z.enum(['multiple_choice', 'true_false'])

export const Question = z
  .object({
    key: z.string(),
    kind: QuestionKind,
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

export const GRAPH_NODE_KINDS = ['file', 'symbol', 'module', 'dependency', 'domain'] as const
export const GraphNodeKind = z.enum(GRAPH_NODE_KINDS)
export type GraphNodeKind = z.infer<typeof GraphNodeKind>

export const GRAPH_LAYERS = ['api', 'service', 'data', 'ui', 'util', 'other'] as const
export const GraphLayer = z.enum(GRAPH_LAYERS)
export type GraphLayer = z.infer<typeof GraphLayer>

export const GRAPH_EDGE_KINDS = [
  'imports',
  'calls',
  'extends',
  'implements',
  'renders',
  'reads',
  'writes',
  'contains',
] as const
export const GraphEdgeKind = z.enum(GRAPH_EDGE_KINDS)
export type GraphEdgeKind = z.infer<typeof GraphEdgeKind>

export const GraphNode = z.object({
  id: z.string().min(1),
  kind: GraphNodeKind,
  label: z.string().min(1),
  path: z.string().optional(),
  symbolKey: z.string().optional(),
  layer: GraphLayer.optional(),
  domain: z.string().optional(),
  summary: z.string().optional(),
})
export type GraphNode = z.infer<typeof GraphNode>

export const GraphEdge = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: GraphEdgeKind,
})
export type GraphEdge = z.infer<typeof GraphEdge>

export const CourseGraph = z.object({
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
})
export type CourseGraph = z.infer<typeof CourseGraph>

export const TourStep = z.object({
  title: z.string(),
  summary: z.string(),
  nodeId: z.string().optional(),
  lessonKey: z.string().optional(),
})
export type TourStep = z.infer<typeof TourStep>

export const Tour = z.object({
  key: z.string(),
  title: z.string(),
  objective: z.string(),
  steps: z.array(TourStep),
})
export type Tour = z.infer<typeof Tour>

export const DIAGRAM_TYPES = [
  'architecture',
  'tree',
  'class',
  'erd',
  'sequence',
  'workflow',
  'dataflow',
  'lifecycle',
] as const
export const DiagramType = z.enum(DIAGRAM_TYPES)
export type DiagramType = z.infer<typeof DiagramType>

export const DiagramNode = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.string().min(1),
  refIds: z.array(z.string()).max(3).default([]),
})
export type DiagramNode = z.infer<typeof DiagramNode>

export const DiagramEdge = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  refIds: z.array(z.string()).max(3).default([]),
})
export type DiagramEdge = z.infer<typeof DiagramEdge>

export const DiagramSpec = z.object({
  id: z.string().min(1),
  type: DiagramType,
  title: z.string(),
  caption: z.string(),
  nodes: z.array(DiagramNode),
  edges: z.array(DiagramEdge),
})
export type DiagramSpec = z.infer<typeof DiagramSpec>

export const CONTENT_SCHEMA_VERSION = 2

export const CourseContentMeta = z.object({
  title: z.string(),
  repo: z.object({ owner: z.string(), name: z.string(), commitSha: CommitSha }),
  audience: Audience,
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
})

export const CourseContentV1 = z.object({
  schemaVersion: z.literal(1),
  meta: CourseContentMeta,
  architecture: Architecture.optional(),
  chapters: z.array(Chapter),
  sourceRefs: z.record(z.string(), SourceRef),
  furtherReading: z.array(z.object({ refId: z.string(), why: z.string() })),
  openQuestions: z.array(z.string()),
})
export type CourseContentV1 = z.infer<typeof CourseContentV1>

export const CourseContent = z.object({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  meta: CourseContentMeta,
  graph: CourseGraph,
  tours: z.array(Tour),
  diagrams: z.array(DiagramSpec),
  architecture: Architecture.optional(),
  chapters: z.array(Chapter),
  sourceRefs: z.record(z.string(), SourceRef),
  furtherReading: z.array(z.object({ refId: z.string(), why: z.string() })),
  openQuestions: z.array(z.string()),
})
export type CourseContent = z.infer<typeof CourseContent>

const AnyCourseContent = z.discriminatedUnion('schemaVersion', [CourseContentV1, CourseContent])

export function upcastCourseContent(raw: unknown): CourseContent {
  const parsed = AnyCourseContent.parse(raw)
  if (parsed.schemaVersion === CONTENT_SCHEMA_VERSION) return parsed
  return {
    ...parsed,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    graph: { nodes: [], edges: [] },
    tours: [],
    diagrams: [],
  }
}

export const ValidationReport = z.object({
  referenceValidity: z.number().min(0).max(1),
  verifiedClaimRatio: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  fabricatedIdentifiers: NonNegativeInt,
  repairs: NonNegativeInt,
  draft: z.boolean(),
  issues: z.array(
    z.object({ lessonKey: z.string().nullable(), code: z.string(), detail: z.string() }),
  ),
})
export type ValidationReport = z.infer<typeof ValidationReport>
