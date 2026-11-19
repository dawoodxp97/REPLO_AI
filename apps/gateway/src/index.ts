export interface Service {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  LANDING: Service
  PRODUCT: Service
  API: Service
}

// One public origin: /app/* goes to the product (Next basePath /app), the API
// paths below go to the API, and everything else is the landing. The API also
// serves browser-level routes outside /rpc: the GitHub App setup redirect, job
// event SSE and the notification SSE.
const API_ROUTES = ['/rpc', '/auth', '/github', '/jobs', '/notifications', '/healthz', '/readyz']

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
