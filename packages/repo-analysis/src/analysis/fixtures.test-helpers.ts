import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyRole, detectLanguage, isExcludedPath, type Language } from '../filters'
import type { AnalyzedFile, AnalysisOptions } from './analyzer'

export const FIXTURES_ROOT = fileURLToPath(new URL('../../fixtures', import.meta.url))

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
    ),
  )
  return nested.flat()
}

export interface LoadedFixture {
  files: AnalyzedFile[]
  options: AnalysisOptions
}

export async function loadFixture(name: string): Promise<LoadedFixture> {
  const root = join(FIXTURES_ROOT, name)
  const files: AnalyzedFile[] = []
  for (const absolute of (await walk(root)).sort()) {
    const path = relative(root, absolute).split('\\').join('/')
    if (isExcludedPath(path)) continue
    const language: Language = detectLanguage(path)
    files.push({
      path,
      text: await readFile(absolute, 'utf8'),
      role: classifyRole(path, language),
      language,
    })
  }
  const manifestText = files.find((file) => file.path === 'package.json')?.text
  const tsconfig = files.find((file) => file.path === 'tsconfig.json')?.text
  return {
    files,
    options: {
      manifest: manifestText === undefined ? undefined : JSON.parse(manifestText),
      tsconfig,
    },
  }
}
