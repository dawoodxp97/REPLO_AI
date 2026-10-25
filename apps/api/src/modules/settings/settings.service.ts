import type { Preferences } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { settingsRepo } from './settings.repo'

interface SettingsDeps {
  db: Db
}

export interface SettingsService {
  get(userId: string): Promise<Preferences>
  update(userId: string, patch: Partial<Preferences>): Promise<Preferences>
}

const DEFAULTS: Preferences = {
  theme: 'light',
  defaultAudience: 'intermediate',
  autoAdvance: true,
  quizzesEnabled: true,
  browserNotifications: false,
}

export function createSettingsService(deps: SettingsDeps): SettingsService {
  const repo = settingsRepo(deps.db)

  const read = async (userId: string): Promise<Preferences> =>
    (await repo.find(userId)) ?? { ...DEFAULTS }

  return {
    get: read,
    async update(userId, patch) {
      await repo.upsert(userId, { ...DEFAULTS, ...patch }, patch)
      return read(userId)
    },
  }
}
