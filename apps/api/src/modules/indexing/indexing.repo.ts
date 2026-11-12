import { and, eq, inArray, lt, notExists, sql } from 'drizzle-orm'
import type { SnapshotStats } from '@replo/contracts'
import type { Analysis } from '@replo/repo-analysis'
import type { DbOrTx } from '../../platform/db/client'
import { insertChunked } from '../../platform/db/query-helpers'
import {
  snapshotFileEdges,
  generationJobs,
  repositories,
  repositorySnapshots,
  snapshotFiles,
  snapshotSymbols,
  tutorialVersions,
  type SnapshotAnalysis,
} from '../../platform/db/schema'
import type { ArchiveRecord } from './archive'
import { ANALYZER_VERSION } from '@replo/repo-analysis'

const snapshotFileColumns = {
  path: snapshotFiles.path,
  blobSha: snapshotFiles.blobSha,
  language: snapshotFiles.language,
  role: snapshotFiles.role,
  sizeBytes: snapshotFiles.sizeBytes,
}

export const snapshotsRepo = (db: DbOrTx) => ({
  async lock(snapshotId: string): Promise<void> {
    await db.execute(sql`select pg_advisory_xact_lock(hashtext(${snapshotId}))`)
  },

  async ensure(input: { repositoryId: string; commitSha: string }): Promise<string> {
    await db
      .insert(repositorySnapshots)
      .values({ ...input, analyzerVersion: ANALYZER_VERSION })
      .onConflictDoNothing()
    const [row] = await db
      .select({ id: repositorySnapshots.id })
      .from(repositorySnapshots)
      .where(
        and(
          eq(repositorySnapshots.repositoryId, input.repositoryId),
          eq(repositorySnapshots.commitSha, input.commitSha),
          eq(repositorySnapshots.analyzerVersion, ANALYZER_VERSION),
        ),
      )
      .limit(1)
    if (!row) throw new Error('snapshot row missing after upsert')
    return row.id
  },

  async findById(snapshotId: string) {
    const [row] = await db
      .select()
      .from(repositorySnapshots)
      .where(eq(repositorySnapshots.id, snapshotId))
      .limit(1)
    return row
  },

  async unreferencedBefore(cutoff: Date, limit: number): Promise<{ id: string }[]> {
    return db
      .select({ id: repositorySnapshots.id })
      .from(repositorySnapshots)
      .where(
        and(
          lt(repositorySnapshots.createdAt, cutoff),
          notExists(
            db
              .select({ id: generationJobs.id })
              .from(generationJobs)
              .where(eq(generationJobs.snapshotId, repositorySnapshots.id)),
          ),
          notExists(
            db
              .select({ id: tutorialVersions.id })
              .from(tutorialVersions)
              .where(eq(tutorialVersions.snapshotId, repositorySnapshots.id)),
          ),
        ),
      )
      .limit(limit)
  },

  async deleteSnapshots(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return
    await db.delete(repositorySnapshots).where(inArray(repositorySnapshots.id, [...ids]))
  },

  async findWithRepository(snapshotId: string) {
    const [row] = await db
      .select({
        repositoryId: repositorySnapshots.repositoryId,
        id: repositorySnapshots.id,
        commitSha: repositorySnapshots.commitSha,
        analysis: repositorySnapshots.analysis,
        owner: repositories.owner,
        repositoryName: repositories.name,
      })
      .from(repositorySnapshots)
      .innerJoin(repositories, eq(repositories.id, repositorySnapshots.repositoryId))
      .where(eq(repositorySnapshots.id, snapshotId))
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
        symbolKey: snapshotSymbols.symbolKey,
        name: snapshotSymbols.name,
        kind: snapshotSymbols.kind,
        path: snapshotSymbols.path,
        startLine: snapshotSymbols.startLine,
        endLine: snapshotSymbols.endLine,
        exported: snapshotSymbols.exported,
        signature: snapshotSymbols.signature,
      })
      .from(snapshotSymbols)
      .where(eq(snapshotSymbols.snapshotId, snapshotId))
  },

  listEdges(snapshotId: string) {
    return db
      .select({ fromPath: snapshotFileEdges.fromPath, toPath: snapshotFileEdges.toPath, kind: snapshotFileEdges.kind })
      .from(snapshotFileEdges)
      .where(eq(snapshotFileEdges.snapshotId, snapshotId))
  },

  async replaceFiles(snapshotId: string, files: readonly ArchiveRecord[]): Promise<void> {
    await db.delete(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId))
    await insertChunked(files, 6, (chunk) =>
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
      .update(repositorySnapshots)
      .set({ status: 'ready', stats })
      .where(eq(repositorySnapshots.id, snapshotId))
  },

  async replaceIndex(snapshotId: string, index: Analysis): Promise<void> {
    await db.delete(snapshotSymbols).where(eq(snapshotSymbols.snapshotId, snapshotId))
    await db.delete(snapshotFileEdges).where(eq(snapshotFileEdges.snapshotId, snapshotId))
    await insertChunked(index.symbols, 9, (chunk) =>
      db.insert(snapshotSymbols).values(
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
    await insertChunked(index.edges, 4, (chunk) =>
      db.insert(snapshotFileEdges).values(
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
    await db.update(repositorySnapshots).set({ analysis }).where(eq(repositorySnapshots.id, snapshotId))
  },
})
