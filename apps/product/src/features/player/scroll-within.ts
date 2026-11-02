export function scrollContainerOf(node: HTMLElement): HTMLElement | null {
  for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
    const { overflowY } = window.getComputedStyle(parent)
    const scrollable = overflowY === 'auto' || overflowY === 'scroll'
    if (scrollable && parent.scrollHeight > parent.clientHeight) return parent
  }
  return null
}

export function centerWithinScrollParent(node: HTMLElement): void {
  const container = scrollContainerOf(node)
  if (container === null) return
  const nodeBox = node.getBoundingClientRect()
  const containerBox = container.getBoundingClientRect()
  const offset = nodeBox.top - containerBox.top + container.scrollTop
  container.scrollTo({ top: offset - (container.clientHeight - nodeBox.height) / 2 })
}
