import type { Provider } from '@replo/contracts'

export const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google AI Studio',
}

export const RECOMMENDED_PROVIDER: Provider = 'openrouter'

export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/keys'
