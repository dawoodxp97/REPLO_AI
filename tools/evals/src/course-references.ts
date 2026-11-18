import type { Block, CourseContent, SourceRef } from '@replo/contracts'
import { allBlocks, allQuestions, usedRefIds } from './course-content'
import type { SnapshotLookup } from './snapshot'
import { ratio } from './statistics'

export interface CitationScore {
  citationValidity: number
  claimSupport: number
  issues: string[]
}

export function scoreCitations(content: CourseContent, lookup: SnapshotLookup): CitationScore {
  const issues: string[] = []
  const published = Object.entries(content.sourceRefs)
  let invalidPublished = 0
  for (const [refId, ref] of published) {
    const reason = refInvalidReason(ref, lookup)
    if (reason === undefined) continue
    invalidPublished += 1
    issues.push(`${refId}: ${reason}`)
  }

  const missing = [...usedRefIds(content)].filter(
    (refId) => content.sourceRefs[refId] === undefined,
  )
  for (const refId of missing) issues.push(`${refId}: not in sourceRefs`)

  const claims = [...observedProse(content), ...allQuestions(content)]
  const supported = claims.filter((claim) =>
    claim.evidence.some((item) => resolves(item.refId, content, lookup)),
  ).length

  return {
    citationValidity: ratio(published.length - invalidPublished, published.length + missing.length),
    claimSupport: ratio(supported, claims.length),
    issues,
  }
}

function resolves(refId: string, content: CourseContent, lookup: SnapshotLookup): boolean {
  const ref = content.sourceRefs[refId]
  return ref !== undefined && refInvalidReason(ref, lookup) === undefined
}

export function refInvalidReason(ref: SourceRef, lookup: SnapshotLookup): string | undefined {
  const file = lookup.file(ref.path)
  if (!file) return 'file not found'
  if (file.blobSha !== ref.blobSha) return 'blob SHA mismatch'
  if (ref.startLine < 1 || ref.endLine < ref.startLine) return 'invalid line range'
  if (ref.endLine > file.lineCount) return 'line range exceeds file'
  if (ref.symbolKey === undefined) return undefined
  const symbol = lookup.symbol(ref.symbolKey)
  if (!symbol) return 'symbol not found'
  if (symbol.path !== ref.path) return 'symbol belongs to another file'
  if (ref.startLine < symbol.startLine || ref.endLine > symbol.endLine)
    return 'line range outside symbol'
  return undefined
}

function observedProse(content: CourseContent): Extract<Block, { type: 'prose' }>[] {
  return allBlocks(content).filter(
    (block): block is Extract<Block, { type: 'prose' }> =>
      block.type === 'prose' && block.kind === 'observed',
  )
}
