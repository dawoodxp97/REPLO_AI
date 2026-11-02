export type DisposeDiagram = () => void

export async function renderMermaid(
  container: HTMLElement,
  definition: string,
  id: string,
  isCancelled: () => boolean,
): Promise<DisposeDiagram> {
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
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
