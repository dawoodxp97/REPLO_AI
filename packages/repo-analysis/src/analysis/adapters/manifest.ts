import { JS_FILE } from '../constants'
import { joinPath } from '../paths'
import type { ResolverContext } from '../resolve'
import { toSourcePath } from '../source-path'
import { entry } from './scores'
import type { Adapter, EntryPoint, ManifestInfo } from './types'

const SCRIPT_NAMES = new Set(['dev', 'start', 'serve', 'preview'])

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
      if (!JS_FILE.test(token)) continue
      const path = at(token)
      if (path) entries.push(entry(path, 'script', `scripts.${name}${where}`))
    }
  }
  const bins = typeof manifest.bin === 'string' ? { [manifest.bin]: '' } : (manifest.bin ?? {})
  for (const [bin, target] of Object.entries(bins)) {
    const path = at(target || bin)
    if (path) entries.push(entry(path, 'bin', `bin.${bin}${where}`))
  }
  if (manifest.main) {
    const path = at(manifest.main)
    if (path) entries.push(entry(path, 'main', `main${where}`))
  }
  return entries
}

export const manifestAdapter: Adapter = (view) => ({
  entryPoints: [
    ...manifestEntries('', view.manifest, view.resolver),
    ...view.packages.flatMap((pkg) => manifestEntries(pkg.dir, pkg.manifest, view.resolver)),
  ],
  routes: [],
})
