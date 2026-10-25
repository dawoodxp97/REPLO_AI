import { useEffect, useState } from 'react'
import type { Highlighter } from 'shiki'
import type { SourceLanguage } from './source-language'

export interface HighlightedToken {
  content: string
  light: string | undefined
  dark: string | undefined
}

export interface HighlightedCode {
  code: string
  language: SourceLanguage
  lines: HighlightedToken[][]
}

type HighlightedLanguage = Exclude<SourceLanguage, 'text'>

const THEMES = { light: 'github-light', dark: 'github-dark' } as const
const highlighters = new Map<HighlightedLanguage, Promise<Highlighter>>()

export function useHighlightedLines(
  code: string,
  language: SourceLanguage,
  enabled: boolean,
): HighlightedToken[][] | null {
  const [highlighted, setHighlighted] = useState<HighlightedCode | null>(null)

  useEffect(() => {
    if (!enabled || language === 'text') return
    let active = true
    highlighterFor(language)
      .then((highlighter) =>
        highlighter.codeToTokensWithThemes(code, { lang: language, themes: THEMES }),
      )
      .then((rows) => {
        if (active) setHighlighted({ code, language, lines: toHighlightedLines(rows) })
      })
      .catch(() => {
        if (active) setHighlighted(null)
      })
    return () => {
      active = false
    }
  }, [code, language, enabled])

  if (highlighted === null || highlighted.code !== code || highlighted.language !== language) {
    return null
  }
  return highlighted.lines
}

function highlighterFor(language: HighlightedLanguage): Promise<Highlighter> {
  const cached = highlighters.get(language)
  if (cached) return cached
  const created = import('shiki').then(({ createHighlighter, createJavaScriptRegexEngine }) =>
    createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: [language],
      engine: createJavaScriptRegexEngine(),
    }),
  )
  highlighters.set(language, created)
  return created
}

function toHighlightedLines(
  rows: readonly (readonly {
    content: string
    variants: Readonly<Record<string, { color?: string } | undefined>>
  }[])[],
): HighlightedToken[][] {
  return rows.map((row) =>
    row.map((token) => ({
      content: token.content,
      light: token.variants['light']?.color,
      dark: token.variants['dark']?.color,
    })),
  )
}
