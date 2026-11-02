import type { KeyDto } from '@replo/contracts'
import { LLM_PROVIDER_LABELS, RECOMMENDED_PROVIDER } from './providers'

type KeyIdentity = Pick<KeyDto, 'provider' | 'label' | 'last4'>

export function keyTitle(key: KeyIdentity): string {
  return `${LLM_PROVIDER_LABELS[key.provider]} · ${key.label}`
}

export function keyMask(key: KeyIdentity): string {
  return `…${key.last4}`
}

export function keyOptionLabel(key: KeyIdentity): string {
  const recommended = key.provider === RECOMMENDED_PROVIDER ? ' (recommended)' : ''
  return `${LLM_PROVIDER_LABELS[key.provider]}${recommended} · ${key.label} · ${keyMask(key)}`
}
