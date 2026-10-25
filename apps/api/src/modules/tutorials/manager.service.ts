import type { TutorialSummaryDto, Visibility } from '@replo/contracts'
import type { Db, Tx } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { isOwner, newShareToken, ownershipOf, tutorialPath } from './access'
import { isOsiApproved } from './licences'
import type { TutorialLibrary } from './library.service'
import { tutorialsRepo } from './tutorials.repo'

export interface OpenLicenseRequired {
  code: 'PUBLIC_REQUIRES_OPEN_LICENSE'
}

export interface TutorialManagerDeps {
  db: Db
  library: Pick<TutorialLibrary, 'summary'>
  productOrigin: string
}

export interface TutorialManager {
  setVisibility(
    userId: string,
    input: { tutorialId: string; visibility: Visibility },
  ): Promise<Outcome<TutorialSummaryDto, OpenLicenseRequired>>
  createShareLink(userId: string, tutorialId: string): Promise<{ token: string; url: string }>
  deleteTutorial(userId: string, tutorialId: string): Promise<void>
  report(reporterId: string, tutorialId: string, reason: string): Promise<void>
  removeForRepository(tx: Tx, userId: string, repositoryId: string): Promise<void>
  settleOwnerDeletion(tx: Tx, userId: string, mode: 'delete' | 'anonymise'): Promise<void>
  recordPush(
    tx: Tx,
    input: { repositoryId: string; commitSha: string; paths: string[]; pushedAt: Date },
  ): Promise<void>
}

export function createTutorialManager(deps: TutorialManagerDeps): TutorialManager {
  const { db, library, productOrigin } = deps
  const repo = tutorialsRepo(db)

  const owned = async (userId: string, tutorialId: string) => {
    const row = await repo.findById(tutorialId)
    if (!row || !isOwner(ownershipOf(row.tutorial), userId)) notFound('Tutorial')
    return row
  }

  const saveVisibility = (tutorialId: string, visibility: Visibility, shareToken: string | null) =>
    repo.updateVisibility(tutorialId, { visibility, shareToken })

  return {
    async setVisibility(userId, input) {
      const row = await owned(userId, input.tutorialId)
      if (input.visibility === 'public' && !isOsiApproved(row.license))
        return refused({ code: 'PUBLIC_REQUIRES_OPEN_LICENSE' })

      await saveVisibility(
        row.tutorial.id,
        input.visibility,
        input.visibility === 'link' ? (row.tutorial.shareToken ?? newShareToken()) : null,
      )
      return ok(await library.summary(userId, row.tutorial.id))
    },

    async createShareLink(userId, tutorialId) {
      const row = await owned(userId, tutorialId)
      const token = row.tutorial.shareToken ?? newShareToken()
      const visibility = row.tutorial.visibility === 'private' ? 'link' : row.tutorial.visibility
      await saveVisibility(row.tutorial.id, visibility, token)
      return {
        token,
        url: `${productOrigin}${tutorialPath(row.owner, row.name, row.tutorial.slug)}?share=${token}`,
      }
    },

    async deleteTutorial(userId, tutorialId) {
      const row = await owned(userId, tutorialId)
      await repo.deleteTutorial(row.tutorial.id)
    },

    async report(reporterId, tutorialId, reason) {
      const row = await repo.findById(tutorialId)
      if (!row || row.tutorial.visibility !== 'public') notFound('Tutorial')
      await repo.insertReport({ tutorialId, reporterId, reason })
    },

    async removeForRepository(tx, userId, repositoryId) {
      await tutorialsRepo(tx).deleteForUserRepo(userId, repositoryId)
    },

    async settleOwnerDeletion(tx, userId, mode) {
      const writer = tutorialsRepo(tx)
      if (mode === 'anonymise') await writer.releasePublicOf(userId)
      await writer.deleteAllOf(userId)
    },

    async recordPush(tx, input) {
      await tutorialsRepo(tx).recordPush(input)
    },
  }
}
