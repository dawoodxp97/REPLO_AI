import type { Catalog, ProviderId } from './catalog'
import type { ModelSpec } from './registry'

export function specFor(catalog: Catalog, provider: ProviderId, id: string): ModelSpec | undefined {
  const model = catalog.model(provider, id)
  if (!model) return undefined
  return {
    provider,
    id,
    structuredOutput: model.supportsStructuredOutput,
    free: model.free,
  }
}