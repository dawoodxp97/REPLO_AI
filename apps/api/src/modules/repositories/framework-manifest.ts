import { detectFramework } from '@replo/repo-analysis'
import type { z } from 'zod'
import type { GitBlob } from '../../platform/github/schemas'
import { PackageManifestJson } from '../../platform/github/schemas'

export function frameworkFromManifest(blob: z.output<typeof GitBlob>): string | null {
  const text =
    blob.encoding === 'base64' ? Buffer.from(blob.content, 'base64').toString('utf8') : blob.content
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return null
  }
  const manifest = PackageManifestJson.safeParse(json)
  return manifest.success ? detectFramework(manifest.data) : null
}
