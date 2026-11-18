import type { CatalogRole, ProviderId } from './catalog'

export type ModelRole = CatalogRole

export interface ModelSpec {
  provider: ProviderId
  id: string
  structuredOutput: boolean
  free: boolean
}