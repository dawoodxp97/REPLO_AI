import { eq, sql } from 'drizzle-orm'
import type { Db, Tx } from '../../platform/db/client'
import { webhookDeliveries } from '../../platform/db/schema'
import { githubInstallationsRepo } from './github.repo'
import {
  EVENT_SCHEMAS,
  isHandledEvent,
  pushChange,
  repositoryChange,
  suspendedAt,
  type HandledEvent,
} from './github.events'
import type { ChangeOutcome, RepositoryLinkSink } from './github.ports'

type WebhookOutcome = 'processed' | 'duplicate' | 'ignored' | 'invalid' | 'skipped'

export interface GithubWebhookService {
  handle(delivery: { deliveryId: string; event: string; payload: unknown }): Promise<WebhookOutcome>
}

type Apply = (tx: Tx) => ChangeOutcome | Promise<ChangeOutcome>

export function createGithubWebhookService(deps: {
  db: Db
  sink: RepositoryLinkSink
}): GithubWebhookService {
  const { db, sink } = deps

  const planFor = (event: HandledEvent, payload: unknown): Apply | undefined => {
    switch (event) {
      case 'installation': {
        const parsed = EVENT_SCHEMAS.installation.safeParse(payload)
        if (!parsed.success) return undefined
        const { action, installation } = parsed.data
        return async (tx) => {
          if (action === 'deleted') {
            await githubInstallationsRepo(tx).markDeleted(installation.id)
            return sink.applyChange(tx, {
              kind: 'installation_removed',
              installationId: installation.id,
            })
          }
          await githubInstallationsRepo(tx).syncMetadata(installation.id, {
            accountLogin: installation.account.login,
            suspendedAt: suspendedAt(installation),
          })
          return 'applied'
        }
      }

      case 'installation_repositories': {
        const parsed = EVENT_SCHEMAS.installation_repositories.safeParse(payload)
        if (!parsed.success) return undefined
        const { action, installation, repositories_removed } = parsed.data
        if (action === 'added') return () => 'applied'
        return (tx) =>
          sink.applyChange(tx, {
            kind: 'repositories_removed',
            installationId: installation.id,
            githubRepoIds: repositories_removed.map((repo) => repo.id),
          })
      }

      case 'repository': {
        const parsed = EVENT_SCHEMAS.repository.safeParse(payload)
        if (!parsed.success) return undefined
        const change = repositoryChange(parsed.data.action, parsed.data.repository)
        return (tx) => sink.applyChange(tx, change)
      }

      case 'push': {
        const parsed = EVENT_SCHEMAS.push.safeParse(payload)
        if (!parsed.success) return undefined
        const change = pushChange(parsed.data)
        return (tx) => sink.applyChange(tx, change)
      }
    }
  }

  return {
    async handle({ deliveryId, event, payload }) {
      if (!isHandledEvent(event)) return 'ignored'
      const apply = planFor(event, payload)
      if (!apply) return 'invalid'

      return db.transaction(async (tx) => {
        const [delivery] = await tx
          .insert(webhookDeliveries)
          .values({ source: 'github', deliveryId, event })
          .onConflictDoNothing()
          .returning({ id: webhookDeliveries.id })
        if (!delivery) return 'duplicate'

        const outcome = await apply(tx)
        await tx
          .update(webhookDeliveries)
          .set({ processedAt: sql`now()` })
          .where(eq(webhookDeliveries.id, delivery.id))
        return outcome === 'applied' ? 'processed' : 'skipped'
      })
    },
  }
}
