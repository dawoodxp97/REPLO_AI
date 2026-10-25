import { getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { fullSchema } from './client'

const tableNames = Object.values(fullSchema)
  .filter((value) => is(value, PgTable))
  .map((table) => getTableName(table))

describe('schema (FR-AUTH-2: individual accounts only)', () => {
  it('reads the application tables', () => {
    expect(tableNames).toContain('generation_jobs')
  })

  it('has no team, workspace, organisation, membership or role tables', () => {
    expect(tableNames.filter((name) => /team|workspace|org|member|role/i.test(name))).toEqual([])
  })
})
