import { randomBytes } from 'node:crypto'
import { loadCatalog, MODEL_CATALOG, type KeyCheck, type KeyChecker } from '@replo/ai'
import { KeyVault } from '../platform/crypto/key-vault'
import type { LearningService } from '../modules/learning/learning.service'

export const fakeKeyChecker = (result: KeyCheck): KeyChecker => ({
  check: async () => result,
})

export const testVault = () => KeyVault.fromEnv(randomBytes(32).toString('base64'), 1)

export const bundledCatalog = () => loadCatalog(MODEL_CATALOG)

export const fixedProgress = (
  ratio: number | null,
): Pick<LearningService, 'completionRatio' | 'completionRatios'> => ({
  completionRatio: async () => ratio,
  completionRatios: async (_userId, targets) =>
    new Map(targets.map((target) => [target.versionId, ratio])),
})
