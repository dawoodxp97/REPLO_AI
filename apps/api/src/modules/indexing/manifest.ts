import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ManifestInfo } from '@replo/repo-analysis'
import { z } from 'zod'

const PackageJsonFile = z.object({
  name: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  main: z.string().optional(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  workspaces: z
    .union([z.array(z.string()), z.object({ packages: z.array(z.string()) })])
    .transform((value) => (Array.isArray(value) ? value : value.packages))
    .optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
})

const MISSING = new Set(['ENOENT', 'ENOTDIR'])

export async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && MISSING.has(String(error.code)))
      return undefined
    throw error
  }
}

export async function readManifest(dir: string): Promise<ManifestInfo> {
  const text = await readOptional(join(dir, 'package.json'))
  if (text === undefined) return {}
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {}
  }
  const parsed = PackageJsonFile.safeParse(raw)
  return parsed.success ? parsed.data : {}
}
