import type { Page } from '@playwright/test'

export const MIN_TOUCH_TARGET = 40

export async function undersizedTouchTargets(page: Page): Promise<string[]> {
  return page.evaluate((minimum) => {
    const INTERACTIVE =
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]'
    const isShown = (element: Element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 1 && rect.height > 1 && style.visibility !== 'hidden'
    }
    const isInlineTextLink = (element: Element) => {
      if (element.tagName !== 'A') return false
      const block = element.closest('p, dd, figcaption')
      if (!block) return false
      const own = element.textContent?.trim().length ?? 0
      return (block.textContent?.trim().length ?? 0) > own + 20
    }
    const isCoveredByLabel = (element: Element) => {
      if (!(element instanceof HTMLInputElement)) return false
      const label = element.closest('label')
      return label !== null && label.getBoundingClientRect().height >= minimum
    }

    return [...document.querySelectorAll(INTERACTIVE)]
      .filter(isShown)
      .filter((element) => !isInlineTextLink(element) && !isCoveredByLabel(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return Math.round(rect.height) < minimum || Math.round(rect.width) < minimum
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''
        return `${element.tagName.toLowerCase()} "${name.slice(0, 40)}" ${Math.round(rect.width)}×${Math.round(rect.height)}`
      })
  }, MIN_TOUCH_TARGET)
}
