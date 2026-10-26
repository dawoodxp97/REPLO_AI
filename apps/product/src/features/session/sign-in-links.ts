import type { OAuthProvider } from '@replo/contracts'
import { env } from '@/lib/env'

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
}

export const providerStartUrl = (provider: OAuthProvider, intent?: 'link') =>
  `${env.apiUrl}/auth/${provider}/start${intent ? `?intent=${intent}` : ''}`
