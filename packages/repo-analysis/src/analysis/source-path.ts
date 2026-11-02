import { JS_FILE } from './constants'
import { normalizePath } from './paths'
import { candidatesFor, type ResolverContext } from './resolve'

const SOURCE_DIRECTORIES = /(^|\/)(dist|build|lib|out)\//

const withoutExtension = (path: string) => path.replace(JS_FILE, '')

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
