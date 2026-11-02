import { useMemo } from 'react'
import { useIsVisible } from '@/hooks/use-is-visible'
import { languageForPath } from './source-language'
import { useHighlightedLines, type HighlightedToken } from './use-highlighted-lines'

export function useHighlightedViewport(
  lines: readonly string[],
  path: string,
): { viewportRef: (node: Element | null) => void; tokens: HighlightedToken[][] | null } {
  const [viewportRef, visible] = useIsVisible()
  const code = useMemo(() => lines.join('\n'), [lines])
  const tokens = useHighlightedLines(code, languageForPath(path), visible)
  return { viewportRef, tokens }
}
