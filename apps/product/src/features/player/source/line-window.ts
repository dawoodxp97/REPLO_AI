export const LINE_WINDOW_SIZE = 1000

export interface LineWindow {
  from: number
  to: number
}

export function lineWindow(total: number, anchor: number, size = LINE_WINDOW_SIZE): LineWindow {
  if (total <= size) return { from: 0, to: total }
  const from = Math.min(Math.max(0, anchor - Math.floor(size / 4)), total - size)
  return { from, to: from + size }
}

export function shiftWindow(
  window: LineWindow,
  total: number,
  direction: 'up' | 'down',
): LineWindow {
  const size = window.to - window.from
  const from =
    direction === 'up'
      ? Math.max(0, window.from - size)
      : Math.min(total - size, window.from + size)
  return { from, to: from + size }
}
