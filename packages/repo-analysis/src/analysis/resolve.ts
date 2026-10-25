import type { CompilerPaths } from './tsconfig'
import { dirOf, joinPath } from './paths'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
const JS_TO_TS: Record<string, string[]> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
}

export interface WorkspacePackage {
  dir: string
  entry: string | undefined
}

export interface ResolverContext {
  files: ReadonlySet<string>
  compilerPaths: CompilerPaths
  workspace: ReadonlyMap<string, WorkspacePackage>
}

const extensionOf = (path: string) => {
  const dot = path.lastIndexOf('.')
  return dot > path.lastIndexOf('/') ? path.slice(dot) : ''
}

export function candidatesFor(
  base: string | undefined,
  files: ReadonlySet<string>,
): string | undefined {
  if (base === undefined) return undefined
  if (files.has(base)) return base
  for (const extension of SOURCE_EXTENSIONS)
    if (files.has(base + extension)) return base + extension
  const stem = base.slice(0, base.length - extensionOf(base).length)
  for (const extension of JS_TO_TS[extensionOf(base)] ?? [])
    if (files.has(stem + extension)) return stem + extension
  for (const extension of SOURCE_EXTENSIONS) {
    const index = joinPath(base, `index${extension}`)
    if (index !== undefined && files.has(index)) return index
  }
  return undefined
}

const matchPattern = (pattern: string, specifier: string): string | null => {
  const star = pattern.indexOf('*')
  if (star === -1) return pattern === specifier ? '' : null
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return null
  if (specifier.length < prefix.length + suffix.length) return null
  return specifier.slice(prefix.length, specifier.length - suffix.length)
}

const workspaceTarget = (specifier: string, context: ResolverContext): Resolution | undefined => {
  const parts = specifier.split('/')
  const scoped = parts[0]?.startsWith('@') === true && parts.length > 1
  const packageName = scoped ? `${parts[0]}/${parts[1]}` : parts[0]
  const subpath = parts.slice(scoped ? 2 : 1)
  const pkg = packageName === undefined ? undefined : context.workspace.get(packageName)
  if (!pkg) return undefined
  if (subpath.length === 0) {
    const found = pkg.entry === undefined ? undefined : candidatesFor(pkg.entry, context.files)
    return found ? { kind: 'internal', path: found } : { kind: 'unresolved' }
  }
  const found = candidatesFor(joinPath(pkg.dir, subpath.join('/')), context.files)
  return found ? { kind: 'internal', path: found } : { kind: 'unresolved' }
}

type Resolution = { kind: 'internal'; path: string } | { kind: 'unresolved' } | { kind: 'external' }

export function resolveSpecifier(
  from: string,
  specifier: string,
  context: ResolverContext,
): Resolution {
  const { files, compilerPaths } = context
  if (specifier.startsWith('.')) {
    const found = candidatesFor(joinPath(dirOf(from), specifier), files)
    return found ? { kind: 'internal', path: found } : { kind: 'unresolved' }
  }

  const workspace = workspaceTarget(specifier, context)
  if (workspace) return workspace

  const aliases = Object.entries(compilerPaths.paths)
    .map(([pattern, targets]) => ({ pattern, targets, match: matchPattern(pattern, specifier) }))
    .filter(
      (alias): alias is { pattern: string; targets: string[]; match: string } =>
        alias.match !== null,
    )
    .sort((a, b) => b.pattern.length - a.pattern.length)
  for (const alias of aliases) {
    for (const target of alias.targets) {
      const replaced = target.replace('*', alias.match)
      const found = candidatesFor(joinPath(compilerPaths.baseUrl ?? '', replaced), files)
      if (found) return { kind: 'internal', path: found }
    }
  }

  if (compilerPaths.baseUrl !== undefined) {
    const found = candidatesFor(joinPath(compilerPaths.baseUrl, specifier), files)
    if (found) return { kind: 'internal', path: found }
  }

  return { kind: 'external' }
}
