import { entry, route } from './scores'
import type { Adapter, EntryPoint, RouteFramework, RouteRecord } from './types'

const HTTP_CONSTRUCTORS = new Map<string, RouteFramework>([
  ['express', 'express'],
  ['express.Router', 'express'],
  ['Router', 'express'],
  ['fastify', 'fastify'],
  ['Fastify', 'fastify'],
])
const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'all',
  'use',
])

export const httpServerAdapter: Adapter = (view) => {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  for (const file of view.files.values()) {
    const facts = file.facts
    if (!facts) continue
    const receivers = new Map<string, RouteFramework>()
    for (const constructor of facts.constructors) {
      const framework = HTTP_CONSTRUCTORS.get(constructor.callee)
      if (framework) receivers.set(constructor.name, framework)
    }
    if (receivers.size === 0) continue
    for (const call of facts.calls) {
      if (!call.receiver || !call.method) continue
      const framework = receivers.get(call.receiver)
      if (!framework) continue
      if (call.method === 'listen') {
        entryPoints.push(entry(file.path, 'server', `${framework} listen`))
        continue
      }
      if (
        !HTTP_METHODS.has(call.method) ||
        call.firstString === null ||
        !call.firstString.startsWith('/')
      )
        continue
      const method =
        call.method === 'all' || call.method === 'use' ? 'ANY' : call.method.toUpperCase()
      routes.push(route(framework, method, call.firstString, file.path, call.line))
    }
  }
  return { entryPoints, routes }
}
