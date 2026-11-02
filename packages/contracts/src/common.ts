import { z } from 'zod'

export const CommitSha = z.string().regex(/^[0-9a-f]{40}$/)

export const Audience = z.enum(['newcomer', 'intermediate', 'expert'])
export type Audience = z.infer<typeof Audience>

export const PROVIDERS = ['openrouter', 'anthropic', 'openai', 'google'] as const
export const Provider = z.enum(PROVIDERS)
export type Provider = z.infer<typeof Provider>

export const ModelPreset = z.enum(['free', 'budget', 'balanced', 'quality', 'custom'])
export type ModelPreset = z.infer<typeof ModelPreset>

export const ModelRole = z.enum(['planner', 'author', 'summarizer', 'judge'])
export type ModelRole = z.infer<typeof ModelRole>

export const VISIBILITIES = ['private', 'link', 'public'] as const
export const Visibility = z.enum(VISIBILITIES)
export type Visibility = z.infer<typeof Visibility>

export const TutorialRef = z.object({ owner: z.string(), repo: z.string(), slug: z.string() })
export type TutorialRef = z.infer<typeof TutorialRef>

export const NonNegativeInt = z.number().int().nonnegative()
export const Progress = z.number().int().min(0).max(100)
export const JobRef = z.object({ jobId: z.uuid() })

const KNOWN_TIME_ZONES = new Set<string>()

export const TimeZone = z.string().refine((zone) => {
  if (KNOWN_TIME_ZONES.has(zone)) return true
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
  } catch {
    return false
  }
  KNOWN_TIME_ZONES.add(zone)
  return true
}, 'unknown IANA time zone')

export const MICROS_PER_USD = 1_000_000

export const OffsetCursor = z.string().regex(/^\d{1,9}$/)
export const IdCursor = z.uuid()

export const MAX_BUDGET_USD = 50
export const BudgetUsd = z.number().positive().max(MAX_BUDGET_USD)

export const pageInput = (cursor: z.ZodType<string>) =>
  z.object({
    limit: z.number().int().min(1).max(100).default(25),
    cursor: cursor.optional(),
  })

export const pageOutput = <Item extends z.ZodType, Cursor extends z.ZodType>(
  item: Item,
  cursor: Cursor,
) => z.object({ items: z.array(item), nextCursor: cursor.nullable() })

export const OkResult = z.object({ ok: z.literal(true) })
export const OK_RESULT: z.infer<typeof OkResult> = { ok: true }
