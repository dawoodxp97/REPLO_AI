import type { FileRole, Language } from '../filters'
import { detectFramework } from '../inventory'
import { createSourceParser, grammarFor, type SourceParser } from './grammars'
import { extractFacts, type FileFacts, type SymbolDraft, type SymbolKind } from './extract'
import {
  FRAMEWORK_ADAPTERS,
  toSourcePath,
  type EntryPoint,
  type ManifestInfo,
  type PackageView,
  type RouteRecord,
} from './adapters'
import { metricsFor, type Edge, type NodeMetrics } from './graph'
import { EMPTY_COMPILER_PATHS, parseCompilerPaths } from './tsconfig'
import {
  candidatesFor,
  resolveSpecifier,
  type ResolverContext,
  type WorkspacePackage,
} from './resolve'
import { dirOf, joinPath } from './paths'
import { z } from 'zod'

export const ANALYZER_VERSION = 1

const DEFAULT_DEADLINE_MS = 2_000
const PARSED_ROLES: ReadonlySet<FileRole> = new Set(['source', 'test'])

export interface AnalyzedFile {
  path: string
  text: string
  role: FileRole
  language: Language
}

export interface SymbolRecord extends SymbolDraft {
  symbolKey: string
  path: string
  kind: SymbolKind
}

export interface EdgeRecord {
  fromPath: string
  toPath: string
  kind: 'import' | 'test_of'
}

export interface Analysis {
  framework: string | null
  symbols: SymbolRecord[]
  edges: EdgeRecord[]
  entryPoints: EntryPoint[]
  routes: RouteRecord[]
  metrics: Record<string, NodeMetrics>
  unresolvedImports: number
  parseErrors: string[]
}

export interface AnalysisSession {
  addFile(file: AnalyzedFile): void
  finish(): Analysis
}

export interface AnalysisOptions {
  manifest?: ManifestInfo
  tsconfig?: string
  deadlineMs?: number
}

export interface Analyzer {
  start(options: AnalysisOptions): AnalysisSession
}

interface FileRecord {
  path: string
  role: FileRole
  facts: FileFacts | undefined
}

export async function createAnalyzer(): Promise<Analyzer> {
  const parser = await createSourceParser()
  return {
    start: (options) => startSession(parser, options),
  }
}

function startSession(parser: SourceParser, options: AnalysisOptions): AnalysisSession {
  const files = new Map<string, FileRecord>()
  const parseErrors: string[] = []
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS
  const manifest = options.manifest ?? {}
  const manifests = new Map<string, PackageFile>()
  const htmlScripts = new Map<string, string[]>()

  return {
    addFile(file) {
      const grammar = grammarFor(file.path)
      let facts: FileFacts | undefined
      if (grammar && PARSED_ROLES.has(file.role)) {
        facts = parser.withTree(file.text, grammar, Date.now() + deadlineMs, (root) =>
          extractFacts(root, file.path),
        )
        if (facts === undefined || facts.hasErrors) parseErrors.push(file.path)
      }
      files.set(file.path, { path: file.path, role: file.role, facts })
      if (file.language === 'html') htmlScripts.set(file.path, scriptSources(file.text))
      if (file.path === 'package.json' || file.path.endsWith('/package.json'))
        manifests.set(dirOf(file.path), readPackageFile(file.text))
    },

    finish() {
      const paths = new Set(files.keys())
      const resolver: ResolverContext = {
        files: paths,
        compilerPaths: parseCompilerPaths(options.tsconfig, ''),
        workspace: workspacePackages(manifest.workspaces ?? [], manifests, paths),
      }
      const members = memberPackages(manifest.workspaces ?? [], manifests)
      const framework = detectFramework(manifest)
      const { edges, unresolvedImports } = buildEdges(files, resolver)
      const symbols = buildSymbols(files)
      const adapters = FRAMEWORK_ADAPTERS.map((adapter) =>
        adapter({ files, resolver, manifest, framework, htmlScripts, packages: members }),
      )
      return {
        framework,
        symbols,
        edges,
        entryPoints: adapters
          .flatMap((output) => output.entryPoints)
          .sort(
            (a, b) =>
              b.score - a.score || a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind),
          ),
        routes: adapters
          .flatMap((output) => output.routes)
          .sort(
            (a, b) =>
              a.path.localeCompare(b.path) || a.line - b.line || a.pattern.localeCompare(b.pattern),
          ),
        metrics: Object.fromEntries(metricsFor(parsedPaths(files), importEdges(edges))),
        unresolvedImports,
        parseErrors: [...new Set(parseErrors)].sort(),
      }
    },
  }
}

const PackageFile = z.object({
  name: z.string().optional(),
  main: z.string().optional(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
})
type PackageFile = z.infer<typeof PackageFile>

const readPackageFile = (text: string): PackageFile => {
  try {
    const parsed = PackageFile.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

const SCRIPT_SRC = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi

const scriptSources = (html: string): string[] =>
  [...html.matchAll(SCRIPT_SRC)].map((match) => match[1] ?? '').filter((src) => src !== '')

const matchesWorkspace = (pattern: string, dir: string): boolean => {
  const normalized = pattern.replace(/^\.\//, '').replace(/\/$/, '')
  if (normalized.endsWith('/*')) return dirOf(dir) === normalized.slice(0, -2)
  return dir === normalized
}

function workspacePackages(
  patterns: readonly string[],
  manifests: ReadonlyMap<string, PackageFile>,
  files: ReadonlySet<string>,
): ReadonlyMap<string, WorkspacePackage> {
  const packages = new Map<string, WorkspacePackage>()
  const resolver: ResolverContext = {
    files,
    compilerPaths: EMPTY_COMPILER_PATHS,
    workspace: new Map<string, WorkspacePackage>(),
  }
  for (const [dir, manifest] of [...manifests].sort(([a], [b]) => a.localeCompare(b))) {
    if (dir === '' || manifest.name === undefined) continue
    if (!patterns.some((pattern) => matchesWorkspace(pattern, dir))) continue
    const entry = manifest.main
      ? toSourcePath(joinPath(dir, manifest.main), resolver)
      : (candidatesFor(joinPath(dir, 'src/index'), files) ??
        candidatesFor(joinPath(dir, 'index'), files))
    packages.set(manifest.name, { dir, entry })
  }
  return packages
}

const memberPackages = (
  patterns: readonly string[],
  manifests: ReadonlyMap<string, PackageFile>,
): PackageView[] =>
  [...manifests]
    .filter(([dir]) => dir !== '' && patterns.some((pattern) => matchesWorkspace(pattern, dir)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dir, manifest]) => ({ dir, manifest }))

const parsedPaths = (files: ReadonlyMap<string, FileRecord>): string[] =>
  [...files.values()]
    .filter((file) => file.facts !== undefined)
    .map((file) => file.path)
    .sort()

const importEdges = (edges: readonly EdgeRecord[]): Edge[] =>
  edges
    .filter((edge) => edge.kind === 'import')
    .map((edge) => ({ from: edge.fromPath, to: edge.toPath }))

function buildEdges(
  files: ReadonlyMap<string, FileRecord>,
  resolver: ResolverContext,
): { edges: EdgeRecord[]; unresolvedImports: number } {
  const edges = new Map<string, EdgeRecord>()
  let unresolvedImports = 0
  for (const file of [...files.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    for (const reference of file.facts?.imports ?? []) {
      const resolution = resolveSpecifier(file.path, reference.specifier, resolver)
      if (resolution.kind === 'external') continue
      if (resolution.kind === 'unresolved') {
        unresolvedImports += 1
        continue
      }
      const target = files.get(resolution.path)
      if (!target || resolution.path === file.path) continue
      addEdge(edges, { fromPath: file.path, toPath: resolution.path, kind: 'import' })
      if (file.role === 'test' && target.role === 'source')
        addEdge(edges, { fromPath: file.path, toPath: resolution.path, kind: 'test_of' })
    }
  }
  const sorted = [...edges.values()].sort(
    (a, b) =>
      a.fromPath.localeCompare(b.fromPath) ||
      a.toPath.localeCompare(b.toPath) ||
      a.kind.localeCompare(b.kind),
  )
  return { edges: sorted, unresolvedImports }
}

const addEdge = (edges: Map<string, EdgeRecord>, edge: EdgeRecord) => {
  edges.set(`${edge.kind}|${edge.fromPath}|${edge.toPath}`, edge)
}

function buildSymbols(files: ReadonlyMap<string, FileRecord>): SymbolRecord[] {
  const records: SymbolRecord[] = []
  for (const file of [...files.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const seen = new Set<string>()
    for (const symbol of file.facts?.symbols ?? []) {
      const base = `${file.path}#${symbol.qualifiedName}`
      const symbolKey = seen.has(base) ? `${base}@${symbol.startLine}` : base
      seen.add(base)
      records.push({ ...symbol, symbolKey, path: file.path })
    }
  }
  return records.sort((a, b) => a.path.localeCompare(b.path) || a.startLine - b.startLine)
}
