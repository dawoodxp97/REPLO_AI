import { implement, ORPCError } from '@orpc/server'
import { contract } from '@replo/contracts'
import type { RequestContext } from './context'

export const os = implement(contract).$context<RequestContext>()

export const authed = os.use(({ context, next }) => {
  if (!context.user || !context.sessionId) throw new ORPCError('UNAUTHORIZED')
  return next({ context: { user: context.user, sessionId: context.sessionId } })
})
