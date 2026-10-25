export const IDENTIFIER_SOURCE = '[A-Za-z_$][\\w$]*'
const CODE_SPAN = /`([^`\n]{1,120})`/g
const CODE_IDENTIFIER = new RegExp(`${IDENTIFIER_SOURCE}(?:\\.${IDENTIFIER_SOURCE})*`, 'g')
const REFERENCE_DEFINITION = /^[ \t]*\[[^\]\n]+\]:[^\n]*$/gm
const BARE_URL = /[ \t]*https?:\/\/[^\s)\]>]+/gi

export function sanitizeMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(REFERENCE_DEFINITION, '')
    .replace(BARE_URL, '')
    .replace(/<\/?[A-Za-z!][^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim()
}

export function codeIdentifiers(markdown: string): string[] {
  return [...markdown.matchAll(CODE_SPAN)].flatMap((match) =>
    [...(match[1] ?? '').matchAll(CODE_IDENTIFIER)].map((token) => token[0]),
  )
}

export function unknownIdentifiers(texts: readonly string[], known: ReadonlySet<string>): string[] {
  const unknown = new Set<string>()
  for (const text of texts) {
    for (const token of codeIdentifiers(text)) {
      if (known.has(token)) continue
      if (token.split('.').every((segment) => known.has(segment))) continue
      unknown.add(token)
    }
  }
  return [...unknown]
}
