export type Language =
  'typescript' | 'javascript' | 'json' | 'markdown' | 'css' | 'html' | 'yaml' | 'other'
export type FileRole = 'source' | 'test' | 'config' | 'doc' | 'generated' | 'asset'

export const MAX_INDEXED_FILE_BYTES = 1_000_000

export const EXCLUDED_DIRS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  '.next',
  'coverage',
  '.git',
])

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'bmp',
  'pdf',
  'zip',
  'gz',
  'tgz',
  'tar',
  'bz2',
  'xz',
  '7z',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp3',
  'mp4',
  'mov',
  'webm',
  'wav',
  'ogg',
  'wasm',
  'bin',
  'exe',
  'dll',
  'so',
  'dylib',
  'class',
  'jar',
])

const LANGUAGE_BY_EXTENSION: Record<string, Language> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'css',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
}

function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase()
}

export function isExcludedPath(path: string): boolean {
  const segments = path.split('/')
  if (segments.slice(0, -1).some((s) => EXCLUDED_DIRS.has(s))) return true
  const file = segments[segments.length - 1] ?? ''
  return file === '.env' || file.startsWith('.env.')
}

export function isBinaryExtension(path: string): boolean {
  return BINARY_EXTENSIONS.has(extensionOf(path))
}

export function looksBinary(head: Uint8Array): boolean {
  const n = Math.min(head.length, 8192)
  for (let i = 0; i < n; i++) if (head[i] === 0) return true
  return false
}

export function detectLanguage(path: string): Language {
  return LANGUAGE_BY_EXTENSION[extensionOf(path)] ?? 'other'
}

function isSupportedSourceLanguage(language: Language): boolean {
  return language === 'typescript' || language === 'javascript'
}

const TEST_PATTERN = /(^|\/)(__tests__|tests?|e2e)\//i
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/i
const GENERATED_FILE = /(\.min\.js|\.d\.ts|\.generated\.[jt]sx?|\.snap)$/i

export function classifyRole(path: string, language: Language = detectLanguage(path)): FileRole {
  if (isBinaryExtension(path)) return 'asset'
  if (GENERATED_FILE.test(path)) return 'generated'
  if (TEST_PATTERN.test(path) || TEST_FILE.test(path)) return 'test'
  if (language === 'markdown') return 'doc'
  if (isSupportedSourceLanguage(language)) {
    const file = path.slice(path.lastIndexOf('/') + 1)
    return /\.config\.[cm]?[jt]s$/.test(file) || /^\.[a-z]+rc\.[cm]?[jt]s$/.test(file)
      ? 'config'
      : 'source'
  }
  return language === 'json' || language === 'yaml' ? 'config' : 'asset'
}
