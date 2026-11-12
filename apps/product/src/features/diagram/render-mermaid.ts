import type { ColorScheme } from './use-color-scheme'

const OUTLINE = 'color-mix(in oklab, var(--foreground) 38%, var(--card))'

const DIAGRAM_THEME_CSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: var(--muted);
    stroke: ${OUTLINE};
    stroke-width: 1px;
    filter: none;
  }
  .node .label, .nodeLabel, .node text { color: var(--foreground); fill: var(--foreground); }
  .cluster rect { fill: transparent; stroke: var(--border); stroke-dasharray: 4 3; filter: none; }
  .cluster .nodeLabel, .cluster-label { color: var(--muted-foreground); fill: var(--muted-foreground); }
  .flowchart-link, .edgePath .path { stroke: var(--muted-foreground); stroke-width: 1px; }
  .arrowheadPath, marker path { fill: var(--muted-foreground); stroke: var(--muted-foreground); }
  .edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg {
    background-color: var(--card);
    color: var(--muted-foreground);
  }
  .edgeLabel rect { fill: var(--card); opacity: 1; }
`

function diagramFontFamily(): string {
  return getComputedStyle(document.body).fontFamily
}

export type DisposeDiagram = () => void

export async function renderMermaid(
  container: HTMLElement,
  definition: string,
  id: string,
  scheme: ColorScheme,
  isCancelled: () => boolean,
): Promise<DisposeDiagram> {
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: scheme === 'dark' ? 'dark' : 'neutral',
    look: 'classic',
    fontFamily: diagramFontFamily(),
    themeCSS: DIAGRAM_THEME_CSS,
  })
  const { svg: markup } = await mermaid.render(id, definition)
  if (isCancelled()) return () => undefined

  const { svg, sheets } = toCspSafeSvg(markup)
  container.replaceChildren(svg)
  return () => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (sheet) => !sheets.includes(sheet),
    )
    container.replaceChildren()
  }
}

export function toCspSafeSvg(markup: string): { svg: Element; sheets: CSSStyleSheet[] } {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = document.importNode(parsed.documentElement, true)
  const sheets: CSSStyleSheet[] = []

  for (const style of Array.from(svg.querySelectorAll('style'))) {
    sheets.push(adoptStylesheet(style.textContent ?? ''))
    style.remove()
  }
  for (const element of [svg, ...Array.from(svg.querySelectorAll('[style]'))]) {
    moveInlineStyle(element)
  }
  return { svg, sheets }
}

function adoptStylesheet(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
  return sheet
}

function moveInlineStyle(element: Element): void {
  const declarations = element.getAttribute('style') ?? ''
  element.removeAttribute('style')
  if (!(element instanceof SVGElement || element instanceof HTMLElement)) return

  for (const declaration of declarations.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator < 0) continue
    const property = declaration.slice(0, separator).trim()
    const value = declaration.slice(separator + 1).trim()
    if (!property || !value) continue
    const important = value.endsWith('!important')
    element.style.setProperty(
      property,
      important ? value.slice(0, -'!important'.length).trim() : value,
      important ? 'important' : '',
    )
  }
}
