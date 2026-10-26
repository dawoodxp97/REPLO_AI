import { z } from 'zod'
import { KEY_BYTES } from './crypto/key-vault'

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)
const optionalString = z.preprocess(emptyToUndefined, z.string().optional())

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),

  API_PUBLIC_URL: z.url(),
  AUTH_COOKIE_DOMAIN: optionalString,
  PRODUCT_ORIGIN: z.url(),

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  GITHUB_APP_ID: optionalString,
  GITHUB_APP_PRIVATE_KEY: optionalString,
  GITHUB_APP_CLIENT_ID: optionalString,
  GITHUB_APP_CLIENT_SECRET: optionalString,
  GITHUB_WEBHOOK_SECRET: optionalString,
  GITHUB_APP_SLUG: optionalString,

  KEY_ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, 'base64').length === KEY_BYTES,
      'KEY_ENCRYPTION_KEY must be base64 of exactly 32 bytes',
    ),
  KEY_ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),

  MAX_LITE_PIPELINE_FILES: z.coerce.number().int().positive().default(300),
  DEFAULT_BYOK_JOB_BUDGET_USD: z.coerce.number().positive().default(2),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  MAX_REPO_FILES: z.coerce.number().int().positive().default(5000),
  MAX_REPO_BYTES: z.coerce.number().int().positive().default(50_000_000),
  SNAPSHOT_DIR: optionalString,
})

const PRODUCTION_REQUIRED = [
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_WEBHOOK_SECRET',
] as const

const EnvSchema = Env.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return
  for (const key of PRODUCTION_REQUIRED) {
    if (!env[key])
      ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` })
  }
})

export type Config = z.infer<typeof Env>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    )
    console.error(`Invalid environment:\n${lines.join('\n')}`)
    process.exit(1)
  }
  return parsed.data
}
