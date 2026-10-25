import type { FileRole } from '../filters'
import type { FrameworkLabel } from '../inventory'
import type { FileFacts } from './extract'
import { dirOf, joinPath, normalizePath } from './paths'
import { candidatesFor, type ResolverContext } from './resolve'

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

interface FileView {
  path: string
  role: FileRole
  facts: FileFacts | undefined
}

interface AnalysisView {
  files: ReadonlyMap<string, FileView>
  resolver: ResolverContext
  manifest: ManifestInfo
  framework: FrameworkLabel | null
  htmlScripts: ReadonlyMap<string, string[]>
  packages: readonly PackageView[]
}

export interface PackageView {
  dir: string
  manifest: ManifestInfo
}

interface AdapterOutput {
  entryPoints: EntryPoint[]
  routes: RouteRecord[]
}

const SCRIPT_NAMES = new Set(['dev', 'start', 'serve', 'preview'])
const SCRIPT_FILE = /\.(m|c)?[jt]sx?$/
const SOURCE_DIRECTORIES = /(^|\/)(dist|build|lib|out)\//
const NEXT_HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const ROUTER_FACTORIES = [
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
  'createRoutesFromElements',
]
const HTTP_CONSTRUCTORS = new Map<string, RouteFramework>([
  ['express', 'express'],
  ['express.Router', 'express'],
  ['Router', 'express'],
  ['fastify', 'fastify'],
  ['Fastify', 'fastify'],
])
const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'all',
  'use',
])

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

const withoutExtension = (path: string) => path.replace(/\.(m|c)?[jt]sx?$/, '')

export function toSourcePath(
  reference: string | undefined,
  resolver: ResolverContext,
): string | undefined {
  const cleaned = reference === undefined ? undefined : normalizePath(reference)
  if (cleaned === undefined) return undefined
  if (resolver.files.has(cleaned)) return cleaned
  const mapped = cleaned.replace(SOURCE_DIRECTORIES, '$1src/')
  return (
    candidatesFor(withoutExtension(mapped), resolver.files) ??
    candidatesFor(withoutExtension(cleaned), resolver.files)
  )
}

function manifestEntries(
  dir: string,
  manifest: ManifestInfo,
  resolver: ResolverContext,
): EntryPoint[] {
  const where = dir === '' ? '' : ` (${dir})`
  const at = (reference: string) => toSourcePath(joinPath(dir, reference), resolver)
  const entries: EntryPoint[] = []
  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    if (!SCRIPT_NAMES.has(name)) continue
    for (const token of command.split(/\s+/)) {
      if (!SCRIPT_FILE.test(token)) continue
      const path = at(token)
      if (path)
        entries.push({
          path,
          kind: 'script',
          score: ENTRY_SCORE.script,
          reason: `scripts.${name}${where}`,
        })
    }
  }
  const bins = typeof manifest.bin === 'string' ? { [manifest.bin]: '' } : (manifest.bin ?? {})
  for (const [bin, target] of Object.entries(bins)) {
    const path = at(target || bin)
    if (path)
      entries.push({ path, kind: 'bin', score: ENTRY_SCORE.bin, reason: `bin.${bin}${where}` })
  }
  if (manifest.main) {
    const path = at(manifest.main)
    if (path) entries.push({ path, kind: 'main', score: ENTRY_SCORE.main, reason: `main${where}` })
  }
  return entries
}

function manifestAdapter(view: AnalysisView): AdapterOutput {
  const entries = [
    ...manifestEntries('', view.manifest, view.resolver),
    ...view.packages.flatMap((pkg) => manifestEntries(pkg.dir, pkg.manifest, view.resolver)),
  ]
  return { entryPoints: entries, routes: [] }
}

const NEXT_APP_FILE = /^(?:src\/)?app\/(.+)\.(tsx|ts|jsx|js)$/
const NEXT_PAGE_FILE = /^(?:src\/)?pages\/(.+)\.(tsx|ts|jsx|js)$/

const routeSegments = (segments: string[]) =>
  '/' +
  segments
    .filter((segment) => segment !== '' && !(segment.startsWith('(') && segment.endsWith(')')))
    .map((segment) => {
      if (segment.startsWith('[[...') && segment.endsWith(']]')) return '*'
      if (segment.startsWith('[...') && segment.endsWith(']')) return '*'
      if (segment.startsWith('[') && segment.endsWith(']')) return `:${segment.slice(1, -1)}`
      return segment
    })
    .join('/')

function nextAdapter(view: AnalysisView): AdapterOutput {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  if (view.framework !== 'Next.js') return { entryPoints, routes }
  for (const file of view.files.values()) {
    const app = NEXT_APP_FILE.exec(file.path)
    if (app) {
      const name = (app[1] ?? '').split('/')
      const base = name.pop() ?? ''
      const directories = routeSegments(name)
      if (base === 'page' && name.length === 0)
        entryPoints.push({
          path: file.path,
          kind: 'page',
          score: ENTRY_SCORE.page,
          reason: 'app/page',
        })
      if (base === 'layout' && name.length === 0)
        entryPoints.push({
          path: file.path,
          kind: 'app_root',
          score: ENTRY_SCORE.app_root,
          reason: 'app/layout',
        })
      if (base === 'page')
        routes.push({
          framework: 'nextjs',
          method: 'GET',
          pattern: directories,
          path: file.path,
          line: 1,
        })
      if (base === 'route') {
        const methods = (file.facts?.exportedFunctions ?? []).filter((name) =>
          NEXT_HTTP_VERBS.has(name),
        )
        for (const method of methods)
          routes.push({
            framework: 'nextjs',
            method,
            pattern: directories,
            path: file.path,
            line: 1,
          })
      }
      continue
    }
    const page = NEXT_PAGE_FILE.exec(file.path)
    if (page) {
      const segments = (page[1] ?? '').split('/')
      if (segments[0] === '_app' || segments[0] === '_document') {
        entryPoints.push({
          path: file.path,
          kind: 'app_root',
          score: ENTRY_SCORE.app_root,
          reason: `pages/${segments[0]}`,
        })
        continue
      }
      const isApi = segments[0] === 'api'
      const pattern = routeSegments(segments.at(-1) === 'index' ? segments.slice(0, -1) : segments)
      routes.push({
        framework: 'nextjs',
        method: isApi ? 'ANY' : 'GET',
        pattern,
        path: file.path,
        line: 1,
      })
      continue
    }
    if (/^(?:src\/)?(middleware|proxy)\.(ts|js)$/.test(file.path))
      entryPoints.push({
        path: file.path,
        kind: 'middleware',
        score: ENTRY_SCORE.middleware,
        reason: 'request middleware',
      })
  }
  return { entryPoints, routes }
}

function reactRouterAdapter(view: AnalysisView): AdapterOutput {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  for (const file of view.files.values()) {
    const calls = file.facts?.calls ?? []
    const factory = calls.find((call) =>
      ROUTER_FACTORIES.some((name) => call.callee.endsWith(name)),
    )
    if (factory)
      entryPoints.push({
        path: file.path,
        kind: 'router',
        score: ENTRY_SCORE.router,
        reason: factory.callee,
      })
    if (view.framework === 'React Router' && /^(?:src\/)?app\/routes\.(ts|tsx)$/.test(file.path))
      entryPoints.push({
        path: file.path,
        kind: 'route_config',
        score: ENTRY_SCORE.route_config,
        reason: 'react-router routes config',
      })
    if (view.framework === 'React Router' && /^(?:src\/)?app\/root\.(tsx|jsx)$/.test(file.path))
      entryPoints.push({
        path: file.path,
        kind: 'app_root',
        score: ENTRY_SCORE.app_root,
        reason: 'app/root',
      })
    if (factory) {
      for (const property of file.facts?.pathProperties ?? [])
        routes.push({
          framework: 'react-router',
          method: 'GET',
          pattern: property.value,
          path: file.path,
          line: property.line,
        })
    }
  }
  return { entryPoints, routes }
}

function httpServerAdapter(view: AnalysisView): AdapterOutput {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  for (const file of view.files.values()) {
    const facts = file.facts
    if (!facts) continue
    const receivers = new Map<string, RouteFramework>()
    for (const constructor of facts.constructors) {
      const framework = HTTP_CONSTRUCTORS.get(constructor.callee)
      if (framework) receivers.set(constructor.name, framework)
    }
    if (receivers.size === 0) continue
    for (const call of facts.calls) {
      if (!call.receiver || !call.method) continue
      const framework = receivers.get(call.receiver)
      if (!framework) continue
      if (call.method === 'listen') {
        entryPoints.push({
          path: file.path,
          kind: 'server',
          score: ENTRY_SCORE.server,
          reason: `${framework} listen`,
        })
        continue
      }
      if (
        !HTTP_METHODS.has(call.method) ||
        call.firstString === null ||
        !call.firstString.startsWith('/')
      )
        continue
      routes.push({
        framework,
        method: call.method === 'all' || call.method === 'use' ? 'ANY' : call.method.toUpperCase(),
        pattern: call.firstString,
        path: file.path,
        line: call.line,
      })
    }
  }
  return { entryPoints, routes }
}

function htmlAdapter(view: AnalysisView): AdapterOutput {
  const entryPoints: EntryPoint[] = []
  for (const [document, scripts] of view.htmlScripts) {
    const base = dirOf(document)
    for (const script of scripts) {
      const reference = script.startsWith('/') ? script.slice(1) : joinPath(base, script)
      const path = toSourcePath(reference, view.resolver)
      if (path)
        entryPoints.push({
          path,
          kind: 'app_root',
          score: ENTRY_SCORE.app_root,
          reason: `${document} script`,
        })
    }
  }
  return { entryPoints, routes: [] }
}

export const FRAMEWORK_ADAPTERS = [
  manifestAdapter,
  htmlAdapter,
  nextAdapter,
  reactRouterAdapter,
  httpServerAdapter,
]
