import type { EntryKind, EntryPoint, RouteFramework, RouteRecord } from './types'

const ENTRY_SCORE: Record<EntryKind, number> = {
  script: 100,
  bin: 90,
  main: 80,
  app_root: 85,
  page: 40,
  middleware: 60,
  router: 70,
  route_config: 75,
  server: 75,
}

export const entry = (path: string, kind: EntryKind, reason: string): EntryPoint => ({
  path,
  kind,
  score: ENTRY_SCORE[kind],
  reason,
})

export const route = (
  framework: RouteFramework,
  method: string,
  pattern: string,
  path: string,
  line: number,
): RouteRecord => ({ framework, method, pattern, path, line })
