import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
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
import { classifyGithubFailure, repoApiPath, type GithubRest } from '../../platform/github/client'
import { JobError } from '../../jobs/errors'
import { extractArchive } from './archive'
import { installDirectory } from './install-directory'
import { readManifest, readOptional } from './manifest'
import { isAnalyzedFile } from './file-policy'
import { snapshotsRepo } from './indexing.repo'

const MAX_TARBALL_BYTES = 200_000_000
const READ_CONCURRENCY = 32
const PURGE_BATCH = 100

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
  tokens: {
    installationToken(installationId: number): Promise<string | undefined>
    userCanAccess(userId: string, repository: { owner: string; name: string }): Promise<boolean>
  }
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

  const userCanAccess = async (
    userId: string,
    repository: { owner: string; name: string },
  ): Promise<boolean> => {
    try {
      return await tokens.userCanAccess(userId, repository)
    } catch (error) {
      const failure = classifyGithubFailure(error)
      if (failure === 'token_rejected')
        throw new JobError(
          'GITHUB_RELINK_REQUIRED',
          false,
          'GitHub rejected your saved sign-in; reconnect GitHub and retry',
        )
      if (failure === 'forbidden')
        throw new JobError('GITHUB_FORBIDDEN', true, 'GitHub temporarily refused the request')
      throw error
    }
  }

  const authorize = async (userId: string, repositoryId: string) => {
    const source = await sources.ingestSource(userId, repositoryId)
    if (!source) throw new JobError('REPO_NOT_ACCESSIBLE', false, 'no active repository link')
    if (source.installationId === null) {
      if (source.isPrivate)
        throw new JobError('REPO_NOT_ACCESSIBLE', false, 'private repo without installation')
      return { ...source, installationId: null }
    }
    if (!(await userCanAccess(userId, { owner: source.owner, name: source.name })))
      throw new JobError('REPO_NOT_ACCESSIBLE', false, 'user cannot access the repository')
    return { ...source, installationId: source.installationId }
  }

  const accessToken = async (installationId: number | null) => {
    if (installationId === null) return undefined
    const token = await tokens.installationToken(installationId)
    if (!token) throw new JobError('REPO_NOT_ACCESSIBLE', false, 'installation no longer exists')
    return token
  }

  const materialize = async (
    snapshot: { id: string; commitSha: string; status: SnapshotStatus },
    source: Awaited<ReturnType<typeof authorize>>,
    signal: AbortSignal,
  ): Promise<void> => {
    const token = await accessToken(source.installationId)
    const response = await rest.download(
      `${repoApiPath(source.owner, source.name)}/tarball/${encodeURIComponent(snapshot.commitSha)}`,
      { token, signal },
    )
    const body = response?.body
    if (!body) throw new JobError('REPO_NOT_ACCESSIBLE', false)

    const { files, stats } = await installDirectory(
      snapshotDir(snapshot.id),
      async (staging) => {
        const extracted = await extractArchive(Readable.fromWeb(body), {
          dir: staging,
          limits: extraction,
          maxCompressedBytes: MAX_TARBALL_BYTES,
          signal,
        })
        const summary = inventory(
          extracted.map((file) => ({ path: file.path, type: 'blob', size: file.sizeBytes })),
        )
        const breach = limitBreach(summary, limits)
        if (breach)
          throw new JobError(
            'REPO_TOO_LARGE',
            false,
            `${breach.metric} ${breach.value} > ${breach.limit}`,
          )
        const framework = detectFramework(await readManifest(staging))
        return { files: extracted, stats: { ...summary, framework } satisfies SnapshotStats }
      },
      { replaceOccupied: snapshot.status !== 'ready' },
    )

    signal.throwIfAborted()
    await db.transaction(async (tx) => {
      const txRepo = snapshotsRepo(tx)
      await txRepo.lock(snapshot.id)
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
      const snapshot = await repo.findWithRepository(snapshotId)
      if (!snapshot) return undefined
      const [manifest, files, symbols, edges] = await Promise.all([
        readManifest(snapshotDir(snapshot.id)),
        repo.listFiles(snapshot.id),
        repo.listSymbols(snapshot.id),
        repo.listEdges(snapshot.id),
      ])
      return {
        repositoryId: snapshot.repositoryId,
        owner: snapshot.owner,
        name: snapshot.repositoryName,
        commitSha: snapshot.commitSha,
        analysis: snapshot.analysis ?? null,
        files,
        symbols,
        edges,
        dependencies: Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
      }
    },

    async purgeUnreferenced(cutoff) {
      const repo = snapshotsRepo(db)
      let purged = 0
      for (;;) {
        const doomed = (await repo.unreferencedBefore(cutoff, PURGE_BATCH)).map((row) => row.id)
        if (doomed.length === 0) return purged
        await Promise.all(doomed.map((id) => rm(snapshotDir(id), { recursive: true, force: true })))
        await repo.deleteSnapshots(doomed)
        purged += doomed.length
      }
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
      const source = await authorize(userId, snapshot.repositoryId)
      if (isMaterialized(snapshot)) return
      await materialize(snapshot, source, signal)
    },

    async index({ userId, snapshotId, signal }) {
      const snapshot = await requireSnapshot(snapshotId)
      const source = await authorize(userId, snapshot.repositoryId)
      if (snapshot.analysis?.analyzerVersion === ANALYZER_VERSION) return
      if (!isMaterialized(snapshot)) await materialize(snapshot, source, signal)

      const dir = snapshotDir(snapshot.id)
      const session = (await loadAnalyzer()).start({
        manifest: await readManifest(dir),
        tsconfig:
          (await readOptional(join(dir, 'tsconfig.json'))) ??
          (await readOptional(join(dir, 'jsconfig.json'))),
      })
      const analyzed = (await snapshotsRepo(db).listFiles(snapshot.id)).filter(isAnalyzedFile)
      for (let offset = 0; offset < analyzed.length; offset += READ_CONCURRENCY) {
        signal.throwIfAborted()
        const batch = analyzed.slice(offset, offset + READ_CONCURRENCY)
        const texts = await Promise.all(batch.map((file) => readOptional(join(dir, file.path))))
        batch.forEach((file, position) => {
          const text = texts[position]
          if (text === undefined || file.language === null) return
          session.addFile({ path: file.path, text, role: file.role, language: file.language })
        })
      }
      const result = session.finish()
      signal.throwIfAborted()
      await db.transaction(async (tx) => {
        const txRepo = snapshotsRepo(tx)
        await txRepo.lock(snapshot.id)
        await txRepo.replaceIndex(snapshot.id, result)
      })
    },
  }
}
