import PgBoss from 'pg-boss'
import type { Logger } from 'pino'
import { declareQueues } from '../jobs/queues'
import { loadConfig, type Config } from './config'
import { createDb, type Db } from './db/client'
import { createLogger } from './logger'
import type { ShutdownStep } from './shutdown'

const BOSS_POOL_MAX = 4

type Pool = ReturnType<typeof createDb>['pool']

export interface Runtime {
  config: Config
  log: Logger
  db: Db
  pool: Pool
  boss: PgBoss
  releaseSteps(bossStopTimeoutMs: number): ShutdownStep[]
}

export async function bootstrap(
  name: string,
  bossOptions: Omit<PgBoss.ConstructorOptions, 'connectionString'> = {},
): Promise<Runtime> {
  const config = loadConfig()
  const log = createLogger({
    level: config.LOG_LEVEL,
    pretty: config.NODE_ENV === 'development',
    name,
  })
  const { db, pool } = createDb(config.DATABASE_URL, {
    max: config.DB_POOL_MAX,
    onPoolError: (err) => log.error({ err }, 'idle pg client error'),
  })

  const boss = new PgBoss({ max: BOSS_POOL_MAX, ...bossOptions, connectionString: config.DATABASE_URL })
  boss.on('error', (err) => log.error({ err }, 'pg-boss error'))
  await boss.start()
  await declareQueues(boss)

  return {
    config,
    log,
    db,
    pool,
    boss,
    releaseSteps: (bossStopTimeoutMs) => [
      { name: 'pg-boss', run: () => boss.stop({ graceful: true, timeout: bossStopTimeoutMs }) },
      { name: 'database pool', run: () => pool.end() },
    ],
  }
}
