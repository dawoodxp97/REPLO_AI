import type { KeyboardEvent } from 'react'

export function moveFocus(
  event: KeyboardEvent<HTMLElement>,
  container: HTMLElement | null,
  input: HTMLInputElement | null,
) {
  const links = Array.from(container?.querySelectorAll<HTMLAnchorElement>('a') ?? [])
  if (links.length === 0) return
  const index = links.findIndex((link) => link === document.activeElement)
  const delta = event.key === 'ArrowDown' ? 1 : -1
  const next = index === -1 ? (delta === 1 ? 0 : links.length - 1) : index + delta
  event.preventDefault()
  if (next < 0) input?.focus()
  else links[Math.min(next, links.length - 1)]?.focus()
}
