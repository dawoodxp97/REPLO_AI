import type { FileRole } from '../../filters'
import type { FrameworkLabel } from '../../inventory'
import type { FileFacts } from '../extract'
import type { ResolverContext } from '../resolve'

export type EntryKind =
  | 'script'
  | 'bin'
  | 'main'
  | 'server'
  | 'router'
  | 'route_config'
  | 'app_root'
  | 'page'
  | 'middleware'
export type RouteFramework = 'nextjs' | 'react-router' | 'express' | 'fastify'

export interface EntryPoint {
  path: string
  kind: EntryKind
  score: number
  reason: string
}

export interface RouteRecord {
  framework: RouteFramework
  method: string
  pattern: string
  path: string
  line: number
}

export interface ManifestInfo {
  name?: string
  workspaces?: string[]
  scripts?: Record<string, string>
  main?: string
  bin?: string | Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export interface FileView {
  path: string
  role: FileRole
  facts: FileFacts | undefined
}

export interface PackageView {
  dir: string
  manifest: ManifestInfo
}

export interface AnalysisView {
  files: ReadonlyMap<string, FileView>
  resolver: ResolverContext
  manifest: ManifestInfo
  framework: FrameworkLabel | null
  htmlScripts: ReadonlyMap<string, string[]>
  packages: readonly PackageView[]
}

export interface AdapterOutput {
  entryPoints: EntryPoint[]
  routes: RouteRecord[]
}

export type Adapter = (view: AnalysisView) => AdapterOutput
