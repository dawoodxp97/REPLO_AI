import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { SnapshotStats } from '@replo/contracts'
import {
  ANALYZER_VERSION,
  createAnalyzer,
  detectFramework,
  inventory,
  limitBreach,
  type Analyzer,
  type EdgeRecord,
  type ExtractionLimits,
  type FileRole,
  type Language,
  type RepoLimits,
  type SymbolKind,
} from '@replo/repo-analysis'
import type { Db, Tx } from '../../platform/db/client'
import type { SnapshotAnalysis, SnapshotStatus } from '../../platform/db/schema'
import type { GithubRest } from '../../platform/github/client'
import { JobError } from '../../jobs/errors'
import { extractArchive } from './archive'
import { readManifest, readOptional } from './manifest'
import { snapshotsRepo } from './indexing.repo'

const MAX_TARBALL_BYTES = 200_000_000

interface SnapshotRef {
  repositoryId: string
  commitSha: string
  status: SnapshotStatus
  createdAt: Date
}

export interface IngestSource {
  owner: string
  name: string
  isPrivate: boolean
  installationId: number | null
}

export interface SnapshotFile {
  path: string
  blobSha: string
  language: Language | null
  role: FileRole
  sizeBytes: number
}

export interface SnapshotSymbol {
  symbolKey: string
  name: string
  kind: SymbolKind
  path: string
  startLine: number
  endLine: number
  exported: boolean
  signature: string | null
}

export interface SnapshotEdge {
  fromPath: string
  toPath: string
  kind: EdgeRecord['kind']
}

export interface SnapshotView {
  repositoryId: string
  owner: string
  name: string
  commitSha: string
  analysis: SnapshotAnalysis | null
  files: SnapshotFile[]
  symbols: SnapshotSymbol[]
  edges: SnapshotEdge[]
  dependencies: string[]
}

export interface IndexingService {
  ensureSnapshot(tx: Tx, input: { repositoryId: string; commitSha: string }): Promise<string>
  snapshotRef(snapshotId: string): Promise<SnapshotRef | undefined>
  ingest(input: { userId: string; snapshotId: string; signal: AbortSignal }): Promise<void>
  index(input: { userId: string; snapshotId: string; signal: AbortSignal }): Promise<void>
  readView(snapshotId: string): Promise<SnapshotView | undefined>
  readText(snapshotId: string, path: string): Promise<string | undefined>
  readFile(snapshotId: string, path: string): Promise<SnapshotFile | undefined>
  listFiles(snapshotId: string): Promise<SnapshotFile[]>
  purgeUnreferenced(cutoff: Date): Promise<number>
}

export interface IndexingDeps {
  db: Db
  rest: GithubRest
  tokens: { installationToken(installationId: number): Promise<string | undefined> }
  sources: {
    ingestSource(userId: string, repositoryId: string): Promise<IngestSource | undefined>
  }
  limits: RepoLimits
  extraction: ExtractionLimits
  snapshotRoot: string
}

export function createIndexingService(deps: IndexingDeps): IndexingService {
  const { db, rest, tokens, sources, limits, extraction, snapshotRoot } = deps
  let analyzer: Promise<Analyzer> | undefined

  const snapshotDir = (snapshotId: string) => join(snapshotRoot, snapshotId)

  const isMaterialized = (snapshot: { id: string; status: SnapshotStatus }) =>
    snapshot.status === 'ready' && existsSync(snapshotDir(snapshot.id))

  const requireSnapshot = async (snapshotId: string) => {
    const snapshot = await snapshotsRepo(db).findById(snapshotId)
    if (!snapshot) throw new JobError('SNAPSHOT_MISSING', false)
    return snapshot
  }

  const accessToken = async (userId: string, repositoryId: string) => {
    const source = await sources.ingestSource(userId, repositoryId)
    if (!source) throw new JobError('REPO_NOT_ACCESSIBLE', false, 'no active repository link')
    if (source.installationId === null) {
      if (source.isPrivate)
        throw new JobError('REPO_NOT_ACCESSIBLE', false, 'private repo without installation')
      return { source, token: undefined }
    }
    const token = await tokens.installationToken(source.installationId)
    if (!token) throw new JobError('REPO_NOT_ACCESSIBLE', false, 'installation no longer exists')
    return { source, token }
  }

  const materialize = async (
    snapshot: { id: string; repositoryId: string; commitSha: string },
    userId: string,
    signal: AbortSignal,
  ): Promise<void> => {
    const { source, token } = await accessToken(userId, snapshot.repositoryId)
    const response = await rest.download(
      `/repos/${source.owner}/${source.name}/tarball/${snapshot.commitSha}`,
      { token, signal },
    )
    if (!response?.body) throw new JobError('REPO_NOT_ACCESSIBLE', false)

    const dir = snapshotDir(snapshot.id)
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    const files = await extractArchive(Readable.fromWeb(response.body), {
      dir,
      limits: extraction,
      maxCompressedBytes: MAX_TARBALL_BYTES,
      signal,
    })

    const summary = inventory(
      files.map((file) => ({ path: file.path, type: 'blob', size: file.sizeBytes })),
    )
    const breach = limitBreach(summary, limits)
    if (breach)
      throw new JobError(
        'REPO_TOO_LARGE',
        false,
        `${breach.metric} ${breach.value} > ${breach.limit}`,
      )

    const framework = detectFramework(await readManifest(dir))
    const stats: SnapshotStats = { ...summary, framework }
    await db.transaction(async (tx) => {
      const txRepo = snapshotsRepo(tx)
      await txRepo.replaceFiles(snapshot.id, files)
      await txRepo.markReady(snapshot.id, stats)
    })
  }

  const loadAnalyzer = () => {
    analyzer ??= createAnalyzer()
    return analyzer
  }

  return {
    ensureSnapshot(tx, input) {
      return snapshotsRepo(tx).ensure(input)
    },

    async readView(snapshotId) {
      const repo = snapshotsRepo(db)
      const snapshot = await repo.findById(snapshotId)
      if (!snapshot) return undefined
      const repository = await repo.repositoryOf(snapshot.repositoryId)
      if (!repository) return undefined
      const manifest = await readManifest(snapshotDir(snapshot.id))
      return {
        repositoryId: snapshot.repositoryId,
        owner: repository.owner,
        name: repository.name,
        commitSha: snapshot.commitSha,
        analysis: snapshot.analysis ?? null,
        files: await repo.listFiles(snapshot.id),
        symbols: await repo.listSymbols(snapshot.id),
        edges: await repo.listEdges(snapshot.id),
        dependencies: Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
      }
    },

    async purgeUnreferenced(cutoff) {
      const repo = snapshotsRepo(db)
      const doomed = (await repo.unreferencedBefore(cutoff)).map((row) => row.id)
      await Promise.all(doomed.map((id) => rm(snapshotDir(id), { recursive: true, force: true })))
      await repo.deleteSnapshots(doomed)
      return doomed.length
    },

    readFile(snapshotId, path) {
      return snapshotsRepo(db).findFile(snapshotId, path)
    },
    listFiles(snapshotId) {
      return snapshotsRepo(db).listFiles(snapshotId)
    },

    async readText(snapshotId, path) {
      if (path.startsWith('/') || path.split('/').includes('..')) return undefined
      return readOptional(join(snapshotDir(snapshotId), path))
    },

    async snapshotRef(snapshotId) {
      const row = await snapshotsRepo(db).findById(snapshotId)
      return row
        ? {
            repositoryId: row.repositoryId,
            commitSha: row.commitSha,
            status: row.status,
            createdAt: row.createdAt,
          }
        : undefined
    },

    async ingest({ userId, snapshotId, signal }) {
      const snapshot = await requireSnapshot(snapshotId)
      if (isMaterialized(snapshot)) return
      await materialize(snapshot, userId, signal)
    },

    async index({ userId, snapshotId, signal }) {
      const snapshot = await requireSnapshot(snapshotId)
      if (snapshot.analysis?.analyzerVersion === ANALYZER_VERSION) return
      if (!isMaterialized(snapshot)) await materialize(snapshot, userId, signal)

      const dir = snapshotDir(snapshot.id)
      const session = (await loadAnalyzer()).start({
        manifest: await readManifest(dir),
        tsconfig:
          (await readOptional(join(dir, 'tsconfig.json'))) ??
          (await readOptional(join(dir, 'jsconfig.json'))),
      })
      for (const file of await snapshotsRepo(db).listFiles(snapshot.id)) {
        signal.throwIfAborted()
        if (file.language === null) continue
        const isManifest = file.path === 'package.json' || file.path.endsWith('/package.json')
        const isAnalyzed =
          isManifest ||
          file.language === 'typescript' ||
          file.language === 'javascript' ||
          file.language === 'html'
        if (!isAnalyzed) continue
        const text = await readOptional(join(dir, file.path))
        if (text === undefined) continue
        session.addFile({
          path: file.path,
          text,
          role: file.role,
          language: file.language,
        })
      }
      const result = session.finish()
      await db.transaction((tx) => snapshotsRepo(tx).replaceIndex(snapshot.id, result))
    },
  }
}
