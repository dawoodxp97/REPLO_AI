import type { Layout } from 'react-resizable-panels'
import { z } from 'zod'

const STORAGE_KEY = 'replo.player.layout'

const StoredLayout = z.record(z.string(), z.number().positive())

export function readPanelLayout(): Layout | undefined {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return undefined
    const parsed = StoredLayout.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export function writePanelLayout(layout: Layout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    return
  }
}
