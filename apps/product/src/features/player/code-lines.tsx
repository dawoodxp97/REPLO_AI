import { cn } from '@replo/ui'
import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import type { HighlightedToken } from './use-highlighted-lines'

export interface LineRange {
  start: number
  end: number
}

export interface CodeLinesProps {
  label: string
  lines: readonly string[]
  firstLine: number
  highlight: LineRange | null
  tokens: HighlightedToken[][] | null
}

export function CodeLines({ label, lines, firstLine, highlight, tokens }: CodeLinesProps) {
  const firstHighlighted = useRef<HTMLSpanElement | null>(null)
  const highlightStart = highlight?.start
  const highlightEnd = highlight?.end
  const firstHighlightIndex = highlight
    ? lines.findIndex((_, index) => isInRange(firstLine + index, highlight))
    : -1

  useEffect(() => {
    firstHighlighted.current?.scrollIntoView({ block: 'center' })
  }, [highlightStart, highlightEnd, firstLine, lines])

  return (
    <pre
      tabIndex={0}
      aria-label={label}
      className="overflow-x-auto rounded-lg border border-border bg-code-bg py-3 font-mono text-[0.8125rem] leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <code className="block min-w-max">
        {lines.map((text, index) => {
          const lineNumber = firstLine + index
          const highlighted = highlight !== null && isInRange(lineNumber, highlight)
          return (
            <span
              key={lineNumber}
              ref={index === firstHighlightIndex ? firstHighlighted : undefined}
              className={cn('block px-4', highlighted && 'bg-code-highlight')}
            >
              <span
                aria-hidden
                className="mr-4 inline-block w-10 text-right text-muted-foreground tabular-nums select-none"
              >
                {lineNumber}
              </span>
              <LineTokens text={text} tokens={tokens?.[index] ?? null} />
            </span>
          )
        })}
      </code>
    </pre>
  )
}

function isInRange(lineNumber: number, range: LineRange): boolean {
  return lineNumber >= range.start && lineNumber <= range.end
}

function LineTokens({ text, tokens }: { text: string; tokens: HighlightedToken[] | null }) {
  if (tokens === null) return text
  return tokens.map((token, index) => (
    <span key={index} className="code-token" style={shikiVariables(token)}>
      {token.content}
    </span>
  ))
}

function shikiVariables(token: HighlightedToken): CSSProperties {
  return { '--shiki-light': token.light, '--shiki-dark': token.dark } as CSSProperties
}
