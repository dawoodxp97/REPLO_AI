import { z } from 'zod'

const PublicEnv = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:7200'),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:7101'),
})

export function parsePublicEnv(source: Record<string, string | undefined>) {
  const parsed = PublicEnv.parse(source)
  return {
    apiUrl: parsed.NEXT_PUBLIC_API_URL,
    apiOrigin: new URL(parsed.NEXT_PUBLIC_API_URL).origin,
    appUrl: parsed.NEXT_PUBLIC_APP_URL,
  }
}

export const env = parsePublicEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})
