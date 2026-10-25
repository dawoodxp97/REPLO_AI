export async function renderMermaid(
  container: HTMLElement,
  definition: string,
  id: string,
): Promise<void> {
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
  const { svg } = await mermaid.render(id, definition)
  container.replaceChildren(toCspSafeSvg(svg))
}

export function toCspSafeSvg(markup: string): Element {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = document.importNode(parsed.documentElement, true)

  for (const style of Array.from(svg.querySelectorAll('style'))) {
    adoptStylesheet(style.textContent ?? '')
    style.remove()
  }
  for (const element of [svg, ...Array.from(svg.querySelectorAll('[style]'))]) {
    moveInlineStyle(element)
  }
  return svg
}

function adoptStylesheet(css: string): void {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
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
