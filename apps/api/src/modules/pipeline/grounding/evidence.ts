import { createHash } from 'node:crypto'
import type { SourceRef } from '@replo/contracts'
import type { SnapshotSymbol } from '../../indexing/indexing.service'
import type { SourceIndex } from './source-index'
import { locateQuote, type LineRange } from './quote'

interface EvidenceInput {
  path: string
  symbol?: string | undefined
  quote?: string | undefined
}

type RefFailure =
  'PATH_NOT_FOUND' | 'NO_ANCHOR' | 'NOT_TEXT' | 'SYMBOL_NOT_FOUND' | 'QUOTE_NOT_FOUND'

type Resolution = { ok: true; ref: SourceRef } | { ok: false; reason: RefFailure }

export function normalisePath(raw: string): string | undefined {
  const path = raw.trim().replace(/^\.\//, '').replace(/^\/+/, '')
  if (path.length === 0 || path.includes('\\')) return undefined
  if (path.split('/').some((segment) => segment === '..' || segment === '')) return undefined
  return path
}

export function resolveEvidence(index: SourceIndex, input: EvidenceInput): Resolution {
  const path = normalisePath(input.path)
  const file = path === undefined ? undefined : index.file(path)
  if (path === undefined || !file) return { ok: false, reason: 'PATH_NOT_FOUND' }
  if (!input.symbol && !input.quote) return { ok: false, reason: 'NO_ANCHOR' }

  const lines = index.lines(file.path)
  if (!lines) return { ok: false, reason: 'NOT_TEXT' }

  let symbol: SnapshotSymbol | undefined
  if (input.symbol) {
    symbol = findSymbol(index, file.path, input.symbol)
    if (!symbol) return { ok: false, reason: 'SYMBOL_NOT_FOUND' }
  }

  let range: LineRange = symbol
    ? { startLine: symbol.startLine, endLine: symbol.endLine }
    : { startLine: 1, endLine: lines.length }

  if (input.quote !== undefined) {
    const located = locateQuote(lines, input.quote, range)
    if (!located) return { ok: false, reason: 'QUOTE_NOT_FOUND' }
    range = located
  }

  return {
    ok: true,
    ref: {
      path: file.path,
      startLine: range.startLine,
      endLine: range.endLine,
      blobSha: file.blobSha,
      ...(symbol ? { symbolKey: symbol.symbolKey } : {}),
    },
  }
}

export function refIdFor(ref: SourceRef): string {
  const digest = createHash('sha256')
    .update(`${ref.path}:${ref.startLine}:${ref.endLine}:${ref.symbolKey ?? ''}`)
    .digest('hex')
  return `r_${digest.slice(0, 12)}`
}

function findSymbol(
  index: SourceIndex,
  path: string,
  reference: string,
): SnapshotSymbol | undefined {
  const exact = index.symbol(reference)
  if (exact) return exact.path === path ? exact : undefined
  return index
    .symbolsIn(path)
    .find(
      (symbol) =>
        symbol.name === reference ||
        symbol.symbolKey.endsWith(`#${reference}`) ||
        symbol.symbolKey.endsWith(`.${reference}`),
    )
}
