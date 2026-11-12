import type { SourceRef } from '@replo/contracts'

export type SourceRefMap = Readonly<Record<string, SourceRef | undefined>>

export function formatLineRange(startLine: number, endLine: number): string {
  return startLine === endLine ? `L${startLine}` : `L${startLine}–${endLine}`
}

export function formatSourceRef(
  reference: Pick<SourceRef, 'path' | 'startLine' | 'endLine'>,
): string {
  return `${reference.path}:${formatLineRange(reference.startLine, reference.endLine)}`
}
