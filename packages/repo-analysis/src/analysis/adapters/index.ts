import { compareText } from '../paths'
import { htmlAdapter } from './html'
import { httpServerAdapter } from './http-server'
import { manifestAdapter } from './manifest'
import { nextAdapter } from './next'
import { reactRouterAdapter } from './react-router'
import type { Adapter, EntryPoint, RouteRecord } from './types'

export type {
  AnalysisView,
  EntryKind,
  EntryPoint,
  ManifestInfo,
  PackageView,
  RouteFramework,
  RouteRecord,
} from './types'

export const FRAMEWORK_ADAPTERS: readonly Adapter[] = [
  manifestAdapter,
  htmlAdapter,
  nextAdapter,
  reactRouterAdapter,
  httpServerAdapter,
]

export const sortEntryPoints = (entries: EntryPoint[]): EntryPoint[] =>
  entries.sort(
    (a, b) => b.score - a.score || compareText(a.path, b.path) || compareText(a.kind, b.kind),
  )

export const sortRoutes = (routes: RouteRecord[]): RouteRecord[] =>
  routes.sort(
    (a, b) => compareText(a.path, b.path) || a.line - b.line || compareText(a.pattern, b.pattern),
  )
