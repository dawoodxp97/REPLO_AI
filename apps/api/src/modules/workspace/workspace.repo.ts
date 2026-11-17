import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { diagramSpecs, repositorySnapshots } from '../../platform/db/schema'

export const workspaceRepo = (db: DbOrTx) => ({
  async graphOf(snapshotId: string) {
    const [row] = await db
      .select({ graph: repositorySnapshots.graph })
      .from(repositorySnapshots)
      .where(eq(repositorySnapshots.id, snapshotId))
      .limit(1)
    return row?.graph ?? null
  },

  diagramsOf(versionId: string) {
    return db
      .select({ diagramId: diagramSpecs.diagramId, type: diagramSpecs.type, spec: diagramSpecs.spec })
      .from(diagramSpecs)
      .where(eq(diagramSpecs.versionId, versionId))
  },
})