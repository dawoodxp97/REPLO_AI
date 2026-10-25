import { describe, expect, it } from 'vitest'
import { loadCatalog, planFor } from './catalog'
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

describe('planFor', () => {
  it('routes balanced to the mid tier for planner and author and the cheap tier for summaries', () => {
    expect(planFor(catalog, 'anthropic', 'balanced')).toEqual({
      kind: 'ok',
      models: {
        planner: 'claude-sonnet-5-5',
        author: 'claude-sonnet-5-5',
        summarizer: 'claude-haiku-5-5',
      },
    })
  })

  it('routes quality to the frontier planner', () => {
    const plan = planFor(catalog, 'openai', 'quality')
    expect(plan).toEqual({
      kind: 'ok',
      models: { planner: 'gpt-5.5', author: 'gpt-5.4', summarizer: 'gpt-5.4-mini' },
    })
  })

  it('routes the OpenRouter presets to verified slugs', () => {
    expect(planFor(catalog, 'openrouter', 'budget')).toEqual({
      kind: 'ok',
      models: {
        planner: 'anthropic/claude-haiku-5.5',
        author: 'anthropic/claude-haiku-5.5',
        summarizer: 'anthropic/claude-haiku-5.5',
      },
    })
    expect(planFor(catalog, 'openrouter', 'quality')).toMatchObject({
      kind: 'ok',
      models: { planner: 'anthropic/claude-opus-5.5' },
    })
  })

  it('refuses the free preset without an allow-listed model and off OpenRouter', () => {
    expect(planFor(catalog, 'openrouter', 'free')).toMatchObject({
      refusal: { code: 'PRESET_UNAVAILABLE', reason: expect.stringContaining('eval gate') },
    })
    expect(planFor(catalog, 'anthropic', 'free')).toMatchObject({
      refusal: { code: 'PRESET_UNAVAILABLE', reason: expect.stringContaining('OpenRouter') },
    })
  })

  it('accepts custom models that advertise structured output and fills the rest from balanced', () => {
    expect(planFor(catalog, 'google', 'custom', { planner: 'gemini-3.1-pro-preview' })).toEqual({
      kind: 'ok',
      models: {
        planner: 'gemini-3.1-pro-preview',
        author: 'gemini-3-flash-preview',
        summarizer: 'gemini-3.1-flash-lite',
      },
    })
  })

  it('refuses a custom model of another provider', () => {
    expect(planFor(catalog, 'google', 'custom', { author: 'gpt-5.4' })).toEqual({
      kind: 'refused',
      refusal: { code: 'CUSTOM_MODEL_NOT_ALLOWED', role: 'author', modelId: 'gpt-5.4' },
    })
  })
})
