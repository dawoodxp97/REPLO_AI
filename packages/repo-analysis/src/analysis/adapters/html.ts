import { dirOf, joinPath } from '../paths'
import { toSourcePath } from '../source-path'
import { entry } from './scores'
import type { Adapter, EntryPoint } from './types'

export const htmlAdapter: Adapter = (view) => {
  const entryPoints: EntryPoint[] = []
  for (const [document, scripts] of view.htmlScripts) {
    const base = dirOf(document)
    for (const script of scripts) {
      const reference = script.startsWith('/') ? script.slice(1) : joinPath(base, script)
      const path = toSourcePath(reference, view.resolver)
      if (path) entryPoints.push(entry(path, 'app_root', `${document} script`))
    }
  }
  return { entryPoints, routes: [] }
}
