import { ORPCError } from '@orpc/server'

export function notFound(what = 'Resource'): never {
  throw new ORPCError('NOT_FOUND', { message: `${what} not found` })
}

export function conflict(message: string): never {
  throw new ORPCError('CONFLICT', { message })
}

export function badRequest(message: string): never {
  throw new ORPCError('BAD_REQUEST', { message })
}
