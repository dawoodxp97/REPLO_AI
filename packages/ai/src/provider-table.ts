import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ProviderId } from './catalog'

export interface KeyCheckRequest {
  url: string
  headers: Record<string, string>
}

interface ProviderEntry {
  keyCheck(apiKey: string): KeyCheckRequest
  model(apiKey: string, modelId: string): LanguageModel
}

export const PROVIDER_TABLE: Record<ProviderId, ProviderEntry> = {
  openrouter: {
    keyCheck: (apiKey) => ({
      url: 'https://openrouter.ai/api/v1/auth/key',
      headers: { authorization: `Bearer ${apiKey}` },
    }),
    model: (apiKey, modelId) => createOpenRouter({ apiKey }).chat(modelId),
  },
  anthropic: {
    keyCheck: (apiKey) => ({
      url: 'https://api.anthropic.com/v1/models',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    }),
    model: (apiKey, modelId) => createAnthropic({ apiKey })(modelId),
  },
  openai: {
    keyCheck: (apiKey) => ({
      url: 'https://api.openai.com/v1/models',
      headers: { authorization: `Bearer ${apiKey}` },
    }),
    model: (apiKey, modelId) => createOpenAI({ apiKey })(modelId),
  },
  google: {
    keyCheck: (apiKey) => ({
      url: 'https://generativelanguage.googleapis.com/v1beta/models',
      headers: { 'x-goog-api-key': apiKey },
    }),
    model: (apiKey, modelId) => createGoogleGenerativeAI({ apiKey })(modelId),
  },
}
