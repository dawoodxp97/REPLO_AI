import {
  CONTENT_SCHEMA_VERSION,
  CourseContent,
  type Audience,
  type CourseGraph,
  type DiagramBlock,
  type DiagramSpec,
  type SourceRef,
  type Tour,
} from '@replo/contracts'
import type { ArchitectureDraft, OutlineDraft } from '../drafts'
import { renderFlowchart } from '../grounding/mermaid'
import type { GroundedDraft, GroundedCourse } from './ground-chapters'

const MAX_OPEN_QUESTIONS = 12

export interface ContentInputs {
  repo: { owner: string; name: string; commitSha: string }
  audience: Audience
  outline: OutlineDraft
  architecture: ArchitectureDraft
  graph: CourseGraph
  tours: Tour[]
  diagrams: DiagramSpec[]
  grounded: GroundedCourse
  extraRefs?: Record<string, SourceRef>
}

export function assembleContent(inputs: ContentInputs): CourseContent {
  const { repo, audience, outline, architecture, graph, tours, diagrams, grounded, extraRefs } = inputs
  const { overview, chapters } = grounded
  const overviewDiagram = architectureBlock(diagrams.find((item) => item.type === 'architecture'))
  return CourseContent.parse({
    schemaVersion: CONTENT_SCHEMA_VERSION,
    meta: {
      title: outline.title,
      repo,
      audience,
      objectives: outline.objectives,
      prerequisites: outline.prerequisites,
    },
    graph,
    tours,
    diagrams,
    architecture:
      overviewDiagram && overview.grounded.lesson.blocks.length > 0
        ? { diagram: overviewDiagram, blocks: overview.grounded.lesson.blocks }
        : undefined,
    chapters: chapters.map((chapter) => ({
      key: chapter.spec.key,
      title: chapter.spec.title,
      summary: chapter.spec.summary,
      objectives: chapter.spec.objectives,
      prerequisites: chapter.spec.prerequisites,
      lessons: chapter.lessons.map((entry) => entry.grounded.lesson),
    })),
    sourceRefs: { ...extraRefs, ...mergedRefs([overview, ...chapters.flatMap((chapter) => chapter.lessons)]) },
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

// The architecture DiagramSpec rendered to a Mermaid block for the course landing page.
export function architectureBlock(diagram: DiagramSpec | undefined): DiagramBlock | undefined {
  if (!diagram) return undefined
  const ids = new Map(diagram.nodes.map((node, position) => [node.id, `g${position}`]))
  const nodeRefs = Object.fromEntries(
    diagram.nodes.map((node) => [ids.get(node.id) as string, node.label]),
  )
  const edges = diagram.edges.flatMap((edge) => {
    const from = ids.get(edge.from)
    const to = ids.get(edge.to)
    return from && to ? [{ from, to }] : []
  })
  if (edges.length === 0) return undefined
  return {
    type: 'diagram',
    mermaid: renderFlowchart({
      direction: 'LR',
      nodes: diagram.nodes.map((node) => ({ id: ids.get(node.id) as string, label: node.label })),
      edges,
    }),
    nodeRefs,
    caption: diagram.caption,
  }
}