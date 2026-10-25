import { and, eq, inArray, lt, notExists } from 'drizzle-orm'
import type { SnapshotStats } from '@replo/contracts'
import type { Analysis } from '@replo/repo-analysis'
import type { DbOrTx } from '../../platform/db/client'
import {
  fileEdges,
  generationJobs,
  repositories,
  repoSnapshots,
  snapshotFiles,
  symbols,
  tutorialVersions,
  type SnapshotAnalysis,
} from '../../platform/db/schema'
import type { ArchiveRecord } from './archive'
import { ANALYZER_VERSION } from '@replo/repo-analysis'

const INSERT_CHUNK = 500

async function insertChunked<T>(
  rows: readonly T[],
  insert: (chunk: T[]) => PromiseLike<unknown>,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK)
    await insert(rows.slice(offset, offset + INSERT_CHUNK))
}

const snapshotFileColumns = {
  path: snapshotFiles.path,
  blobSha: snapshotFiles.blobSha,
  language: snapshotFiles.language,
  role: snapshotFiles.role,
  sizeBytes: snapshotFiles.sizeBytes,
}

export const snapshotsRepo = (db: DbOrTx) => ({
  async ensure(input: { repositoryId: string; commitSha: string }): Promise<string> {
    await db
      .insert(repoSnapshots)
      .values({ ...input, analyzerVersion: ANALYZER_VERSION })
      .onConflictDoNothing()
    const [row] = await db
      .select({ id: repoSnapshots.id })
      .from(repoSnapshots)
      .where(
        and(
          eq(repoSnapshots.repositoryId, input.repositoryId),
          eq(repoSnapshots.commitSha, input.commitSha),
          eq(repoSnapshots.analyzerVersion, ANALYZER_VERSION),
        ),
      )
      .limit(1)
    if (!row) throw new Error('snapshot row missing after upsert')
    return row.id
  },

  async findById(snapshotId: string) {
    const [row] = await db
      .select()
      .from(repoSnapshots)
      .where(eq(repoSnapshots.id, snapshotId))
      .limit(1)
    return row
  },

  async unreferencedBefore(cutoff: Date): Promise<{ id: string }[]> {
    return db
      .select({ id: repoSnapshots.id })
      .from(repoSnapshots)
      .where(
        and(
          lt(repoSnapshots.createdAt, cutoff),
          notExists(
            db
              .select({ id: generationJobs.id })
              .from(generationJobs)
              .where(eq(generationJobs.snapshotId, repoSnapshots.id)),
          ),
          notExists(
            db
              .select({ id: tutorialVersions.id })
              .from(tutorialVersions)
              .where(eq(tutorialVersions.snapshotId, repoSnapshots.id)),
          ),
        ),
      )
  },

  async deleteSnapshots(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return
    await db.delete(repoSnapshots).where(inArray(repoSnapshots.id, [...ids]))
  },

  async repositoryOf(repositoryId: string) {
    const [row] = await db
      .select({ owner: repositories.owner, name: repositories.name })
      .from(repositories)
      .where(eq(repositories.id, repositoryId))
      .limit(1)
    return row
  },

  async findFile(snapshotId: string, path: string) {
    const [row] = await db
      .select(snapshotFileColumns)
      .from(snapshotFiles)
      .where(and(eq(snapshotFiles.snapshotId, snapshotId), eq(snapshotFiles.path, path)))
      .limit(1)
    return row
  },

  listFiles(snapshotId: string) {
    return db
      .select(snapshotFileColumns)
      .from(snapshotFiles)
      .where(eq(snapshotFiles.snapshotId, snapshotId))
  },

  listSymbols(snapshotId: string) {
    return db
      .select({
        symbolKey: symbols.symbolKey,
        name: symbols.name,
        kind: symbols.kind,
        path: symbols.path,
        startLine: symbols.startLine,
        endLine: symbols.endLine,
        exported: symbols.exported,
        signature: symbols.signature,
      })
      .from(symbols)
      .where(eq(symbols.snapshotId, snapshotId))
  },

  listEdges(snapshotId: string) {
    return db
      .select({ fromPath: fileEdges.fromPath, toPath: fileEdges.toPath, kind: fileEdges.kind })
      .from(fileEdges)
      .where(eq(fileEdges.snapshotId, snapshotId))
  },

  async replaceFiles(snapshotId: string, files: readonly ArchiveRecord[]): Promise<void> {
    await db.delete(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId))
    await insertChunked(files, (chunk) =>
      db.insert(snapshotFiles).values(
        chunk.map((file) => ({
          snapshotId,
          path: file.path,
          blobSha: file.blobSha,
          language: file.language,
          sizeBytes: file.sizeBytes,
          role: file.role,
        })),
      ),
    )
  },

  async markReady(snapshotId: string, stats: SnapshotStats) {
    await db
      .update(repoSnapshots)
      .set({ status: 'ready', stats })
      .where(eq(repoSnapshots.id, snapshotId))
  },

  async replaceIndex(snapshotId: string, index: Analysis): Promise<void> {
    await db.delete(symbols).where(eq(symbols.snapshotId, snapshotId))
    await db.delete(fileEdges).where(eq(fileEdges.snapshotId, snapshotId))
    await insertChunked(index.symbols, (chunk) =>
      db.insert(symbols).values(
        chunk.map((symbol) => ({
          snapshotId,
          symbolKey: symbol.symbolKey,
          name: symbol.name,
          kind: symbol.kind,
          path: symbol.path,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          exported: symbol.exported,
          signature: symbol.signature,
        })),
      ),
    )
    await insertChunked(index.edges, (chunk) =>
      db.insert(fileEdges).values(
        chunk.map((edge) => ({
          snapshotId,
          fromPath: edge.fromPath,
          toPath: edge.toPath,
          kind: edge.kind,
        })),
      ),
    )
    const analysis: SnapshotAnalysis = {
      analyzerVersion: ANALYZER_VERSION,
      framework: index.framework,
      entryPoints: index.entryPoints,
      routes: index.routes,
      metrics: index.metrics,
      unresolvedImports: index.unresolvedImports,
      parseErrors: index.parseErrors,
    }
    await db.update(repoSnapshots).set({ analysis }).where(eq(repoSnapshots.id, snapshotId))
  },
})
