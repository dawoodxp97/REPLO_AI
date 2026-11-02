import { entry, route } from './scores'
import type { Adapter, EntryPoint, RouteRecord } from './types'

const ROUTER_FACTORIES = [
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
  'createRoutesFromElements',
]

export const reactRouterAdapter: Adapter = (view) => {
  const entryPoints: EntryPoint[] = []
  const routes: RouteRecord[] = []
  for (const file of view.files.values()) {
    const calls = file.facts?.calls ?? []
    const factory = calls.find((call) =>
      ROUTER_FACTORIES.some((name) => call.callee.endsWith(name)),
    )
    if (factory) entryPoints.push(entry(file.path, 'router', factory.callee))
    if (view.framework === 'React Router' && /^(?:src\/)?app\/routes\.(ts|tsx)$/.test(file.path))
      entryPoints.push(entry(file.path, 'route_config', 'react-router routes config'))
    if (view.framework === 'React Router' && /^(?:src\/)?app\/root\.(tsx|jsx)$/.test(file.path))
      entryPoints.push(entry(file.path, 'app_root', 'app/root'))
    if (factory) {
      for (const property of file.facts?.pathProperties ?? [])
        routes.push(route('react-router', 'GET', property.value, file.path, property.line))
    }
  }
  return { entryPoints, routes }
}
