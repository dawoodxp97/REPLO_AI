import { z } from 'zod'

export const PROVIDERS = ['openrouter', 'anthropic', 'openai', 'google'] as const
export type ProviderId = (typeof PROVIDERS)[number]

export const TIERS = ['frontier', 'mid', 'cheap', 'free'] as const
export type Tier = (typeof TIERS)[number]

export const ROLES = ['planner', 'author', 'summarizer'] as const
export type CatalogRole = (typeof ROLES)[number]

const CatalogModel = z.object({
  id: z.string().min(1),
  provider: z.enum(PROVIDERS),
  label: z.string().min(1),
  free: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  inputUsdPerMTok: z.number().nonnegative().nullable(),
  outputUsdPerMTok: z.number().nonnegative().nullable(),
  verified: z.boolean(),
  priceSource: z.string().min(1),
})
export type CatalogModel = z.infer<typeof CatalogModel>

const ProviderTiers = z.object({
  frontier: z.string().nullable(),
  mid: z.string().nullable(),
  cheap: z.string().nullable(),
})

const CatalogFile = z
  .object({
    version: z.literal(1),
    providers: z.record(z.enum(PROVIDERS), ProviderTiers),
    models: z.array(CatalogModel),
    freeAllowList: z.array(z.string()),
  })
  .superRefine((file, ctx) => {
    const byId = new Map<string, CatalogModel>()
    for (const model of file.models) {
      if (byId.has(model.id))
        ctx.addIssue({ code: 'custom', message: `duplicate model ${model.id}` })
      byId.set(model.id, model)
    }
    for (const provider of PROVIDERS) {
      for (const tier of ['frontier', 'mid', 'cheap'] as const) {
        const id = file.providers[provider][tier]
        if (id === null) continue
        const model = byId.get(id)
        if (!model || model.provider !== provider)
          ctx.addIssue({
            code: 'custom',
            message: `${provider}.${tier} must name a model of provider ${provider}`,
          })
      }
    }
    for (const id of file.freeAllowList) {
      const model = byId.get(id)
      if (!model || model.provider !== 'openrouter' || !model.free)
        ctx.addIssue({
          code: 'custom',
          message: `free allow-list entry ${id} must be a free OpenRouter model`,
        })
    }
  })

export interface Catalog {
  file: z.infer<typeof CatalogFile>
  model(provider: ProviderId, id: string): CatalogModel | undefined
}

export function loadCatalog(raw: unknown): Catalog {
  const file = CatalogFile.parse(raw)
  const byKey = new Map(file.models.map((model) => [`${model.provider}:${model.id}`, model]))
  return { file, model: (provider, id) => byKey.get(`${provider}:${id}`) }
}