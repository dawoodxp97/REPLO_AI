import { useEffect, useMemo, useState } from 'react'
import type { HighlighterCore } from 'shiki/core'
import { useIsVisible } from '@/hooks/use-is-visible'
import { languageForPath, type SourceLanguage } from './source-language'

export interface HighlightedToken {
  content: string
  light: string | undefined
  dark: string | undefined
}

interface HighlightedCode {
  code: string
  language: SourceLanguage
  lines: HighlightedToken[][]
}

type HighlightedLanguage = Exclude<SourceLanguage, 'text'>

const THEMES = { light: 'github-light-high-contrast', dark: 'github-dark-default' } as const
const highlighters = new Map<HighlightedLanguage, Promise<HighlighterCore>>()

// Fine-grained Shiki: the full `shiki` entry pulls every grammar (~11 MB in the
// Worker bundle) and the Worker then misses Cloudflare's startup CPU budget.
const languageModule = (language: HighlightedLanguage) => {
  switch (language) {
    case 'typescript':
      return import('shiki/langs/typescript.mjs')
    case 'tsx':
      return import('shiki/langs/tsx.mjs')
    case 'javascript':
      return import('shiki/langs/javascript.mjs')
    case 'jsx':
      return import('shiki/langs/jsx.mjs')
    case 'json':
      return import('shiki/langs/json.mjs')
    case 'css':
      return import('shiki/langs/css.mjs')
    case 'html':
      return import('shiki/langs/html.mjs')
    case 'markdown':
      return import('shiki/langs/markdown.mjs')
    case 'yaml':
      return import('shiki/langs/yaml.mjs')
  }
}

export function useHighlightedViewport(
  lines: readonly string[],
  path: string,
): { viewportRef: (node: Element | null) => void; tokens: HighlightedToken[][] | null } {
  const [viewportRef, visible] = useIsVisible()
  const code = useMemo(() => lines.join('\n'), [lines])
  const tokens = useHighlightedLines(code, languageForPath(path), visible)
  return { viewportRef, tokens }
}

function useHighlightedLines(
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

function highlighterFor(language: HighlightedLanguage): Promise<HighlighterCore> {
  const cached = highlighters.get(language)
  if (cached) return cached
  const created: Promise<HighlighterCore> = Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/themes/github-light-high-contrast.mjs'),
    import('shiki/themes/github-dark-default.mjs'),
    languageModule(language),
  ])
    .then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }, light, dark, lang]) =>
      createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [lang.default],
        engine: createJavaScriptRegexEngine(),
      }),
    )
    .catch((error: unknown) => {
      if (highlighters.get(language) === created) highlighters.delete(language)
      throw error
    })
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
