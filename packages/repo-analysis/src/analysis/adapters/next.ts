import { HTTP_VERBS } from '../constants'
import { entry, route } from './scores'
import type { Adapter, EntryPoint, RouteRecord } from './types'

const NEXT_APP_FILE = /^(?:src\/)?app\/(.+)\.(tsx|ts|jsx|js)$/
const NEXT_PAGE_FILE = /^(?:src\/)?pages\/(.+)\.(tsx|ts|jsx|js)$/
const NEXT_HTTP_VERBS: ReadonlySet<string> = new Set(HTTP_VERBS)

const routeSegments = (segments: string[]) =>
  '/' +
  segments
    .filter((segment) => segment !== '' && !(segment.startsWith('(') && segment.endsWith(')')))
    .map((segment) => {
      if (segment.startsWith('[[...') && segment.endsWith(']]')) return '*'
      if (segment.startsWith('[...') && segment.endsWith(']')) return '*'
      if (segment.startsWith('[') && segment.endsWith(']')) return `:${segment.slice(1, -1)}`
      return segment
    })
    .join('/')

export const nextAdapter: Adapter = (view) => {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  if (view.framework !== 'Next.js') return { entryPoints, routes }
  for (const file of view.files.values()) {
    const app = NEXT_APP_FILE.exec(file.path)
    if (app) {
      const name = (app[1] ?? '').split('/')
      const base = name.pop() ?? ''
      const directories = routeSegments(name)
      if (base === 'page' && name.length === 0)
        entryPoints.push(entry(file.path, 'page', 'app/page'))
      if (base === 'layout' && name.length === 0)
        entryPoints.push(entry(file.path, 'app_root', 'app/layout'))
      if (base === 'page') routes.push(route('nextjs', 'GET', directories, file.path, 1))
      if (base === 'route') {
        const methods = (file.facts?.exportedFunctions ?? []).filter((exported) =>
          NEXT_HTTP_VERBS.has(exported),
        )
        for (const method of methods)
          routes.push(route('nextjs', method, directories, file.path, 1))
      }
      continue
    }
    const page = NEXT_PAGE_FILE.exec(file.path)
    if (page) {
      const segments = (page[1] ?? '').split('/')
      if (segments[0] === '_app' || segments[0] === '_document') {
        entryPoints.push(entry(file.path, 'app_root', `pages/${segments[0]}`))
        continue
      }
      const isApi = segments[0] === 'api'
      const pattern = routeSegments(segments.at(-1) === 'index' ? segments.slice(0, -1) : segments)
      routes.push(route('nextjs', isApi ? 'ANY' : 'GET', pattern, file.path, 1))
      continue
    }
    if (/^(?:src\/)?(middleware|proxy)\.(ts|js)$/.test(file.path))
      entryPoints.push(entry(file.path, 'middleware', 'request middleware'))
  }
  return { entryPoints, routes }
}
