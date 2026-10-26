import type { AddressInfo } from 'node:net'
import type { App } from '../platform/http'
import type { AuthService } from '../modules/identity/auth.service'
import { SESSION_COOKIE } from '../modules/identity/session'

export interface ParsedFrame {
  id: string | undefined
  event: string | undefined
  data: unknown
}

const parseBlock = (block: string): ParsedFrame | undefined => {
  const lines = block.split('\n')
  if (lines.every((line) => line.startsWith(':') || line === '')) return undefined
  const frame: ParsedFrame = { id: undefined, event: undefined, data: undefined }
  for (const line of lines) {
    if (line.startsWith('id: ')) frame.id = line.slice(4)
    else if (line.startsWith('event: ')) frame.event = line.slice(7)
    else if (line.startsWith('data: ')) frame.data = JSON.parse(line.slice(6))
  }
  return frame
}

export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<ParsedFrame> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    let end = buffer.indexOf('\n\n')
    while (end !== -1) {
      const frame = parseBlock(buffer.slice(0, end))
      buffer = buffer.slice(end + 2)
      if (frame) yield frame
      end = buffer.indexOf('\n\n')
    }
  }
}

export const sessionCookieFor = (userId: string) => ({ cookie: `${SESSION_COOKIE}=${userId}` })

export const stubAuth: Pick<AuthService, 'currentSession'> = {
  currentSession: async (token) =>
    token
      ? {
          sessionId: `session-${token}`,
          user: { id: token, name: 'Developer', email: `${token}@test.invalid`, image: null },
        }
      : null,
}

export async function listenOnLoopback(app: App): Promise<string> {
  await app.listen({ port: 0, host: '127.0.0.1' })
  const { port } = app.server.address() as AddressInfo
  return `http://127.0.0.1:${port}`
}
