import { classifyRole, detectLanguage, isBinaryExtension, isExcludedPath, isIndexableRole } from './filters'

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
}

export interface Inventory {
  fileCount: number
  sourceFileCount: number
  indexableFileCount: number
  totalBytes: number
  languages: Record<string, number>
}

export interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const FRAMEWORKS = [
  ['next', 'Next.js'],
  ['react-router', 'React Router'],
  ['@react-router/dev', 'React Router'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
] as const

export type FrameworkLabel = (typeof FRAMEWORKS)[number][1]

export function inventory(entries: readonly TreeEntry[]): Inventory {
  const summary: Inventory = {
    fileCount: 0,
    sourceFileCount: 0,
    indexableFileCount: 0,
    totalBytes: 0,
    languages: {},
  }
  for (const entry of entries) {
    if (entry.type !== 'blob' || isExcludedPath(entry.path)) continue
    const language = detectLanguage(entry.path)
    const role = classifyRole(entry.path, language)
    summary.fileCount += 1
    if (role === 'source') summary.sourceFileCount += 1
    if (isIndexableRole(role)) summary.indexableFileCount += 1
    if (!isBinaryExtension(entry.path)) summary.totalBytes += entry.size ?? 0
    const languageKey = language === 'other' ? 'other' : language
    summary.languages[languageKey] = (summary.languages[languageKey] ?? 0) + 1
  }
  return summary
}

export function detectFramework(manifest: PackageManifest): FrameworkLabel | null {
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  return FRAMEWORKS.find(([dependency]) => declared.has(dependency))?.[1] ?? null
}
