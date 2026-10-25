import type { Catalog, ProviderId } from './catalog'
import type { ModelSpec } from './registry'

export function specFor(catalog: Catalog, provider: ProviderId, id: string): ModelSpec | undefined {
  const model = catalog.model(provider, id)
  if (!model || model.inputUsdPerMTok === null || model.outputUsdPerMTok === null) return undefined
  return {
    provider,
    id,
    inputUsdPerMTok: model.inputUsdPerMTok,
    outputUsdPerMTok: model.outputUsdPerMTok,
    structuredOutput: model.supportsStructuredOutput,
    free: model.free,
  }
}
