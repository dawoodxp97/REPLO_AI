import type { GraphLayer } from '@replo/contracts'

// Per-file semantic facts the enrich stage adds to the structural graph.
export interface FileEnrichment {
  summary: string
  layer: GraphLayer
  domain: string
}

// Keyed by repository path.
export type Enrichment = Record<string, FileEnrichment>

export interface Concept {
  term: string
  summary: string
}

export interface Flow {
  name: string
  summary: string
  // Ordered file paths the flow moves through.
  steps: string[]
}

export function enrichedCount(enrichment: Enrichment): number {
  return Object.keys(enrichment).length
}