export interface SnapshotFileFact {
  path: string
  blobSha: string
  lineCount: number
}

export interface SnapshotSymbolFact {
  symbolKey: string
  name: string
  path: string
  startLine: number
  endLine: number
}

export interface SnapshotEdgeFact {
  fromPath: string
  toPath: string
  kind: string
}

export interface SnapshotFacts {
  files: readonly SnapshotFileFact[]
  symbols: readonly SnapshotSymbolFact[]
  edges: readonly SnapshotEdgeFact[]
}

export interface SnapshotLookup {
  file(path: string): SnapshotFileFact | undefined
  symbol(symbolKey: string): SnapshotSymbolFact | undefined
  hasDirectory(path: string): boolean
}

export function snapshotLookup(facts: SnapshotFacts): SnapshotLookup {
  const files = new Map(facts.files.map((file) => [file.path, file]))
  const symbols = new Map(facts.symbols.map((symbol) => [symbol.symbolKey, symbol]))
  return {
    file: (path) => files.get(path),
    symbol: (symbolKey) => symbols.get(symbolKey),
    hasDirectory: (path) => {
      const prefix = `${path}/`
      return facts.files.some((file) => file.path.startsWith(prefix))
    },
  }
}
