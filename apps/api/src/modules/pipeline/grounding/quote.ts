export interface LineRange {
  startLine: number
  endLine: number
}

const MIN_QUOTE_LENGTH = 8

const normalise = (text: string): string => text.replace(/\s+/g, ' ').trim()

export function locateQuote(
  lines: readonly string[],
  quote: string,
  within: LineRange,
): LineRange | undefined {
  const needle = normalise(quote)
  if (needle.length < MIN_QUOTE_LENGTH) return undefined

  const first = within.startLine - 1
  const starts: number[] = []
  let flat = ''
  for (let index = first; index < within.endLine && index < lines.length; index++) {
    starts.push(flat.length)
    flat += `${normalise(lines[index] ?? '')} `
  }

  const found = flat.indexOf(needle)
  if (found < 0) return undefined

  const lastChar = found + needle.length - 1
  return {
    startLine: first + lastIndexAtOrBefore(starts, found) + 1,
    endLine: first + lastIndexAtOrBefore(starts, lastChar) + 1,
  }
}

function lastIndexAtOrBefore(starts: readonly number[], offset: number): number {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((starts[middle] ?? 0) <= offset) low = middle
    else high = middle - 1
  }
  return low
}
