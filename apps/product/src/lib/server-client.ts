import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '@replo/contracts'
import { headers } from 'next/headers'
import { cache } from 'react'
import { serverEnv } from './server-env'

export type ServerApi = ContractRouterClient<typeof contract>

export const serverApi = cache(async (): Promise<ServerApi> => {
  const cookie = (await headers()).get('cookie')
  const link = new RPCLink({
    url: `${serverEnv.apiInternalUrl}/rpc`,
    fetch: (request, init) => fetch(request, { ...init, cache: 'no-store' }),
    headers: () => (cookie ? { cookie } : {}),
  })
  return createORPCClient(link)
})
