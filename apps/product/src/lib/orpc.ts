import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { contract } from '@replo/contracts'
import { env } from './env'

export interface ApiCallContext {
  idempotencyKey?: string
}

const link = new RPCLink<ApiCallContext>({
  url: `${env.apiUrl}/rpc`,
  fetch: (request, init) => fetch(request, { ...init, credentials: 'include' }),
  headers: ({ context }) =>
    context.idempotencyKey ? { 'idempotency-key': context.idempotencyKey } : {},
})

export const client: ContractRouterClient<typeof contract, ApiCallContext> = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)
