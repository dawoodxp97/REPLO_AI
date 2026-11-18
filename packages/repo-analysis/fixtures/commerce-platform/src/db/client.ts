import { Pool } from 'pg'
import type { Config } from '../config'

export function createPool(config: Config): Pool {
  return new Pool({ connectionString: config.databaseUrl })
}
