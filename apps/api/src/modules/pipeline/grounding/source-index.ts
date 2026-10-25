import { normalisePath } from './evidence'
import { IDENTIFIER_SOURCE } from './markdown'
import type {
  SnapshotEdge,
  SnapshotFile,
  SnapshotSymbol,
  SnapshotView,
} from '../../indexing/indexing.service'

export type SnapshotIndexData = Readonly<
  Pick<SnapshotView, 'files' | 'symbols' | 'edges' | 'dependencies'>
>

export type ReadText = (path: string) => Promise<string | undefined>

const IDENTIFIER_TOKEN = new RegExp(IDENTIFIER_SOURCE, 'g')

export class SourceIndex {
  private readonly fileByPath: Map<string, SnapshotFile>
  private readonly symbolByKey: Map<string, SnapshotSymbol>
  private readonly symbolsByPath: Map<string, SnapshotSymbol[]>
  private readonly edgeKeys: Set<string>
  private readonly linesByPath = new Map<string, readonly string[]>()
  private identifiers: ReadonlySet<string> | undefined

  constructor(
    private readonly data: SnapshotIndexData,
    private readonly readText: ReadText,
  ) {
    this.fileByPath = new Map(data.files.map((file) => [file.path, file]))
    this.symbolByKey = new Map(data.symbols.map((symbol) => [symbol.symbolKey, symbol]))
    this.symbolsByPath = groupBy(data.symbols, (symbol) => symbol.path)
    this.edgeKeys = new Set(data.edges.map((edge) => edgeKey(edge.fromPath, edge.toPath)))
  }

  get files(): readonly SnapshotFile[] {
    return this.data.files
  }

  get edges(): readonly SnapshotEdge[] {
    return this.data.edges
  }

  file(path: string): SnapshotFile | undefined {
    return this.fileByPath.get(path)
  }

  hasDirectory(path: string): boolean {
    const prefix = `${path}/`
    return this.data.files.some((file) => file.path.startsWith(prefix))
  }

  symbol(symbolKey: string): SnapshotSymbol | undefined {
    return this.symbolByKey.get(symbolKey)
  }

  symbolsIn(path: string): readonly SnapshotSymbol[] {
    return this.symbolsByPath.get(path) ?? []
  }

  hasFileEdge(fromPath: string, toPath: string): boolean {
    return this.edgeKeys.has(edgeKey(fromPath, toPath))
  }

  connects(fromPath: string, toPath: string): boolean {
    if (this.file(fromPath) && this.file(toPath)) return this.hasFileEdge(fromPath, toPath)
    const from = this.within(fromPath)
    const to = this.within(toPath)
    return this.data.edges.some((edge) => from(edge.fromPath) && to(edge.toPath))
  }

  lines(path: string): readonly string[] | undefined {
    return this.linesByPath.get(path)
  }

  async load(paths: Iterable<string>): Promise<void> {
    for (const raw of new Set(paths)) {
      const path = normalisePath(raw)
      if (path === undefined || this.linesByPath.has(path) || !this.file(path)) continue
      const text = await this.readText(path)
      if (text !== undefined) this.linesByPath.set(path, text.split(/\r?\n/))
    }
  }

  async knownIdentifiers(): Promise<ReadonlySet<string>> {
    if (this.identifiers) return this.identifiers
    const known = new Set<string>()
    for (const symbol of this.data.symbols) known.add(symbol.name)
    for (const dependency of this.data.dependencies) known.add(dependency)
    for (const file of this.data.files) {
      for (const segment of file.path.split('/')) {
        known.add(segment)
        known.add(stripExtension(segment))
      }
    }
    for (const file of this.data.files) {
      const text = await this.readText(file.path)
      if (text === undefined) continue
      for (const match of text.matchAll(IDENTIFIER_TOKEN)) known.add(match[0])
    }
    this.identifiers = known
    return known
  }

  private within(path: string): (candidate: string) => boolean {
    const prefix = `${path}/`
    return (candidate) => candidate === path || candidate.startsWith(prefix)
  }
}

function edgeKey(fromPath: string, toPath: string): string {
  return `${fromPath}\u0000${toPath}`
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const bucket = groups.get(key(item))
    if (bucket) bucket.push(item)
    else groups.set(key(item), [item])
  }
  return groups
}
