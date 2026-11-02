import type { LanguageModel } from 'ai'
import type { ProviderId } from './catalog'
import { PROVIDER_TABLE } from './provider-table'

export interface RunContext {
  provider: ProviderId
  decryptedKey: string
}

export function modelFor(run: RunContext, modelId: string): LanguageModel {
  return PROVIDER_TABLE[run.provider].model(run.decryptedKey, modelId)
}
