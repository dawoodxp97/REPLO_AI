import type { App } from '../../platform/http'
import type { Auth } from './auth'
import { toWebHeaders } from './auth'

export function registerAuthRoutes(app: App, auth: Auth) {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)
      const hasBody =
        request.method !== 'GET' &&
        request.method !== 'HEAD' &&
        request.body !== undefined &&
        request.body !== null
      const webRequest = new Request(url, {
        method: request.method,
        headers: toWebHeaders(request.headers),
        ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
      })

      const response = await auth.handler(webRequest)

      reply.status(response.status)
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'set-cookie') reply.header(key, value)
      })
      const cookies = response.headers.getSetCookie()
      if (cookies.length > 0) reply.header('set-cookie', cookies)
      return reply.send(response.body ? await response.text() : null)
    },
  })
}
