import { Question, type Block, type Lesson, type SourceRef } from '@replo/contracts'
import type { BlockDraft, EvidenceDraft, LessonDraft, QuestionDraft } from '../drafts'
import { refIdFor, resolveEvidence } from './evidence'
import { checkDiagram } from './mermaid'
import { sanitizeMarkdown, unknownIdentifiers } from './markdown'
import type { SourceIndex } from './source-index'

export type FailureCode =
  | 'UNSUPPORTED_CLAIM'
  | 'UNRESOLVED_EVIDENCE'
  | 'UNRESOLVED_CODE'
  | 'INVALID_DIAGRAM'
  | 'UNVERIFIED_HOP'
  | 'FABRICATED_IDENTIFIER'
  | 'UNSUPPORTED_QUESTION'
  | 'INVALID_QUESTION'

export interface Failure {
  code: FailureCode
  location: string
  detail: string
}

export interface GroundedLesson {
  lesson: Lesson
  refs: Record<string, SourceRef>
  failures: Failure[]
  claims: { total: number; supported: number }
  references: { total: number; resolved: number }
  fabricated: number
}

type Ledger = Omit<GroundedLesson, 'lesson'>

export function groundLesson(
  draft: LessonDraft,
  index: SourceIndex,
  known: ReadonlySet<string>,
): GroundedLesson {
  const ledger: Ledger = {
    refs: {},
    failures: [],
    claims: { total: 0, supported: 0 },
    references: { total: 0, resolved: 0 },
    fabricated: 0,
  }

  const recordEvidence = (
    evidence: readonly EvidenceDraft[],
    location: string,
    failure: Extract<FailureCode, 'UNRESOLVED_EVIDENCE' | 'UNRESOLVED_CODE'>,
  ): string[] => {
    const refIds: string[] = []
    for (const item of evidence) {
      ledger.references.total++
      const result = resolveEvidence(index, item)
      if (!result.ok) {
        ledger.failures.push({ code: failure, location, detail: `${item.path}: ${result.reason}` })
        continue
      }
      ledger.references.resolved++
      const refId = refIdFor(result.ref)
      ledger.refs[refId] = result.ref
      if (!refIds.includes(refId)) refIds.push(refId)
    }
    return refIds
  }

  const recordFabricated = (texts: readonly string[], location: string): boolean => {
    const unknown = unknownIdentifiers(texts, known)
    if (unknown.length === 0) return false
    ledger.fabricated += unknown.length
    ledger.failures.push({ code: 'FABRICATED_IDENTIFIER', location, detail: unknown.join(', ') })
    return true
  }

  const prose = (block: Extract<BlockDraft, { type: 'prose' }>, location: string): Block[] => {
    const observed = block.kind === 'observed'
    if (observed) ledger.claims.total++
    const refIds = recordEvidence(block.evidence, location, 'UNRESOLVED_EVIDENCE')
    const md = sanitizeMarkdown(block.md)
    if (recordFabricated([md], location)) return []
    if (md.length === 0) return []
    if (observed && refIds.length === 0)
      ledger.failures.push({
        code: 'UNSUPPORTED_CLAIM',
        location,
        detail: 'observed claim cites no resolvable source',
      })
    const kind = refIds.length > 0 ? block.kind : 'interpretation'
    if (observed && refIds.length > 0) ledger.claims.supported++
    return [{ type: 'prose', md, kind, evidence: refIds.map((refId) => ({ refId })) }]
  }

  const code = (block: Extract<BlockDraft, { type: 'code' }>, location: string): Block[] => {
    const [refId] = recordEvidence([block.source], location, 'UNRESOLVED_CODE')
    if (!refId) return []
    const caption = sanitizeMarkdown(block.caption)
    if (recordFabricated([caption], location)) return []
    return [{ type: 'code', refId, caption }]
  }

  const diagram = (block: Extract<BlockDraft, { type: 'diagram' }>, location: string): Block[] => {
    const verdict = checkDiagram(block.mermaid, block.nodeRefs, index)
    if (!verdict.ok) {
      ledger.failures.push({ code: 'INVALID_DIAGRAM', location, detail: verdict.reason })
      return []
    }
    if (verdict.diagram.unverifiedHops > 0)
      ledger.failures.push({
        code: 'UNVERIFIED_HOP',
        location,
        detail: `${verdict.diagram.unverifiedHops} hop(s) are not edges in the file graph`,
      })
    const caption = sanitizeMarkdown(block.caption)
    if (recordFabricated([caption], location)) return []
    return [
      {
        type: 'diagram',
        mermaid: verdict.diagram.mermaid,
        nodeRefs: verdict.diagram.nodeRefs,
        caption,
      },
    ]
  }

  const callout = (block: Extract<BlockDraft, { type: 'callout' }>, location: string): Block[] => {
    const md = sanitizeMarkdown(block.md)
    if (recordFabricated([md], location)) return []
    return md.length === 0 ? [] : [{ type: 'callout', tone: block.tone, md }]
  }

  const exercise = (
    block: Extract<BlockDraft, { type: 'exercise' }>,
    location: string,
  ): Block[] => {
    const prompt = sanitizeMarkdown(block.prompt)
    const hints = block.hints.map(sanitizeMarkdown)
    if (recordFabricated([prompt, ...hints], location)) return []
    return [{ type: 'exercise', prompt, hints, solutionRefs: [] }]
  }

  const question = (item: QuestionDraft, location: string): Question[] => {
    ledger.claims.total++
    const refIds = recordEvidence(item.evidence, location, 'UNRESOLVED_EVIDENCE')
    const prompt = sanitizeMarkdown(item.prompt)
    const explanation = sanitizeMarkdown(item.explanation)
    const options = item.options.map((option) => ({
      key: option.key,
      text: sanitizeMarkdown(option.text),
    }))
    if (recordFabricated([prompt, explanation, ...options.map((option) => option.text)], location))
      return []
    if (refIds.length === 0) {
      ledger.failures.push({
        code: 'UNSUPPORTED_QUESTION',
        location,
        detail: 'question cites no resolvable source',
      })
      return []
    }
    const parsed = Question.safeParse({
      key: item.key,
      kind: item.kind,
      prompt,
      options,
      correct: item.correct,
      explanation,
      evidence: refIds.map((refId) => ({ refId })),
    })
    if (!parsed.success) {
      ledger.failures.push({
        code: 'INVALID_QUESTION',
        location,
        detail: parsed.error.issues.map((issue) => issue.message).join('; '),
      })
      return []
    }
    ledger.claims.supported++
    return [parsed.data]
  }

  const blocks = draft.blocks.flatMap((block, position): Block[] => {
    const location = `block:${position}`
    switch (block.type) {
      case 'prose':
        return prose(block, location)
      case 'code':
        return code(block, location)
      case 'diagram':
        return diagram(block, location)
      case 'callout':
        return callout(block, location)
      case 'exercise':
        return exercise(block, location)
    }
  })

  const quiz = draft.quiz.flatMap((item) => question(item, `question:${item.key}`))
  const title = sanitizeMarkdown(draft.title)
  recordFabricated([title], 'title')

  const usedRefIds = new Set([
    ...blocks.flatMap((block) =>
      block.type === 'prose' ? block.evidence.map((item) => item.refId) : [],
    ),
    ...blocks.flatMap((block) => (block.type === 'code' ? [block.refId] : [])),
    ...quiz.flatMap((item) => item.evidence.map((evidence) => evidence.refId)),
  ])

  return {
    lesson: {
      key: draft.key,
      title,
      minutes: draft.minutes,
      blocks,
      quiz,
    },
    refs: Object.fromEntries(
      Object.entries(ledger.refs).filter(([refId]) => usedRefIds.has(refId)),
    ),
    failures: ledger.failures,
    claims: ledger.claims,
    references: ledger.references,
    fabricated: ledger.fabricated,
  }
}
