export interface Service {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  LANDING: Service
  PRODUCT: Service
  API: Service
}

// One public origin: /app/* goes to the product (Next basePath /app), the API
// subpaths below go to the API, and everything else is the landing.
const API_ROUTES = ['/rpc', '/auth', '/healthz', '/readyz']

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (API_ROUTES.some((prefix) => isUnder(pathname, prefix))) return env.API.fetch(request)
    if (isUnder(pathname, '/app')) return env.PRODUCT.fetch(request)
    return env.LANDING.fetch(request)
  },
}
