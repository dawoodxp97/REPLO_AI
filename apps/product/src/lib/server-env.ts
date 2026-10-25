import { z } from 'zod'
import { env } from './env'

const ServerEnv = z.object({
  API_INTERNAL_URL: z.url().optional(),
})

export function parseServerEnv(source: Record<string, string | undefined>) {
  const parsed = ServerEnv.parse(source)
  return { apiInternalUrl: parsed.API_INTERNAL_URL ?? env.apiUrl }
}

export const serverEnv = parseServerEnv({ API_INTERNAL_URL: process.env.API_INTERNAL_URL })
