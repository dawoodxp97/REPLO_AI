import type { Preferences } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { PREFERENCE_DEFAULTS, settingsRepo } from './settings.repo'

interface SettingsDeps {
  db: Db
}

export interface SettingsService {
  get(userId: string): Promise<Preferences>
  update(userId: string, patch: Partial<Preferences>): Promise<Preferences>
}

export function createSettingsService(deps: SettingsDeps): SettingsService {
  const repo = settingsRepo(deps.db)

  return {
    async get(userId) {
      return (await repo.find(userId)) ?? { ...PREFERENCE_DEFAULTS }
    },
    update: (userId, patch) => repo.upsert(userId, patch),
  }
}
