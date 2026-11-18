import { describe, expect, it } from 'vitest'
import { loadCatalog } from './catalog'
import { MODEL_CATALOG as catalogJson } from './catalog-data'

const catalog = loadCatalog(catalogJson)

describe('model catalogue data', () => {
  it('covers all four providers with three tiers each', () => {
    for (const provider of ['openrouter', 'anthropic', 'openai', 'google'] as const) {
      expect(catalog.file.providers[provider]).toEqual({
        frontier: expect.any(String),
        mid: expect.any(String),
        cheap: expect.any(String),
      })
    }
  })

  it('rejects a tier that names a model of another provider', () => {
    const broken = structuredClone(catalogJson)
    broken.providers.openai.mid = 'claude-sonnet-5-5'
    expect(() => loadCatalog(broken)).toThrow(/openai.mid/)
  })

  it('rejects a free allow-list entry that is not a free OpenRouter model', () => {
    const broken = { ...structuredClone(catalogJson), freeAllowList: ['claude-haiku-5-5'] }
    expect(() => loadCatalog(broken)).toThrow(/allow-list/)
  })
})
