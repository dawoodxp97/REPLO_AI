import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ProviderId } from './catalog'

export interface RunContext {
  provider: ProviderId
  decryptedKey: string
}

export function modelFor(run: RunContext, modelId: string): LanguageModel {
  switch (run.provider) {
    case 'openrouter':
      return createOpenRouter({ apiKey: run.decryptedKey }).chat(modelId)
    case 'anthropic':
      return createAnthropic({ apiKey: run.decryptedKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey: run.decryptedKey })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey: run.decryptedKey })(modelId)
  }
}
