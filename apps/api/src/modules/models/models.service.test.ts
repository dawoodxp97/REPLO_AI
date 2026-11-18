import { loadCatalog, type CatalogModel } from '@replo/ai'
import { describe, expect, it } from 'vitest'
import type { Db } from '../../platform/db/client'
import { createModelsService } from './models.service'

const freeModel: CatalogModel = {
  id: 'openrouter/free-model:free',
  provider: 'openrouter',
  label: 'Free model',
  free: true,
  supportsStructuredOutput: true,
  inputUsdPerMTok: null,
  outputUsdPerMTok: null,
  verified: true,
  priceSource: 'test',
}

const catalog = (freeAllowList: string[]) =>
  loadCatalog({
    version: 1,
    providers: {
      openrouter: { frontier: null, mid: null, cheap: null },
      anthropic: { frontier: null, mid: null, cheap: null },
      openai: { frontier: null, mid: null, cheap: null },
      google: { frontier: null, mid: null, cheap: null },
    },
    models: [freeModel],
    freeAllowList,
  })

const service = (freeAllowList: string[]) =>
  createModelsService({ db: {} as Db, catalog: catalog(freeAllowList) })

describe('models service allow-list', () => {
  it('does not list a free model that has not passed the eval gate', () => {
    expect(service([]).catalog().models).toEqual([])
  })

  it('does not plan a free model that has not passed the eval gate', () => {
    expect(service([]).plan('openrouter', freeModel.id)).toBeUndefined()
  })

  it('rejects a free model that has not passed the eval gate as a default', async () => {
    expect(await service([]).setPreferences('user', { defaultModel: freeModel.id })).toMatchObject({
      kind: 'refused',
    })
  })

  it('lists and plans a free model after the gate admits it', () => {
    expect(service([freeModel.id]).catalog().models).toEqual([
      expect.objectContaining({ id: freeModel.id }),
    ])
    expect(service([freeModel.id]).plan('openrouter', freeModel.id)).toMatchObject({
      provider: 'openrouter',
      pipeline: 'lite',
    })
  })
})
