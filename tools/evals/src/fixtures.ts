import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  classifyRole,
  detectLanguage,
  isExcludedPath,
  type AnalyzedFile,
  type AnalysisOptions,
} from '@replo/repo-analysis'
import { z } from 'zod'

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
export const FIXTURES_ROOT = join(REPO_ROOT, 'packages/repo-analysis/fixtures')

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
    ),
  )
  return nested.flat()
}

const ManifestSchema = z.looseObject({
  name: z.string().optional(),
  workspaces: z.array(z.string()).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  main: z.string().optional(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
})

export interface RepoSnapshotInput {
  files: AnalyzedFile[]
  options: AnalysisOptions
}

export async function readRepo(absoluteRoot: string): Promise<RepoSnapshotInput> {
  const files: AnalyzedFile[] = []
  for (const absolute of (await walk(absoluteRoot)).sort()) {
    const path = relative(absoluteRoot, absolute).split('\\').join('/')
    if (isExcludedPath(path)) continue
    const language = detectLanguage(path)
    files.push({
      path,
      text: await readFile(absolute, 'utf8'),
      role: classifyRole(path, language),
      language,
    })
  }
  const manifest = files.find((file) => file.path === 'package.json')
  const tsconfig = files.find((file) => file.path === 'tsconfig.json')
  return {
    files,
    options: {
      manifest: manifest ? ManifestSchema.parse(JSON.parse(manifest.text)) : undefined,
      tsconfig: tsconfig?.text,
    },
  }
}

export const fixtureRoot = (source: string) => join(REPO_ROOT, source)
