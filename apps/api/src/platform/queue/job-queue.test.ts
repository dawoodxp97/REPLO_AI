import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { bindPlaceholders } from './job-queue'

const dialect = new PgDialect()

describe('bindPlaceholders', () => {
  it('turns numbered placeholders into ordered parameters', () => {
    const query = dialect.sqlToQuery(
      bindPlaceholders('insert into job (id, name) values ($1, $2) on conflict do nothing', [
        'job-1',
        'generate-tutorial',
      ]),
    )
    expect(query.sql).toBe('insert into job (id, name) values ($1, $2) on conflict do nothing')
    expect(query.params).toEqual(['job-1', 'generate-tutorial'])
  })

  it('reuses a placeholder that appears twice', () => {
    const query = dialect.sqlToQuery(bindPlaceholders('select $1::text, $1::text', ['x']))
    expect(query.sql).toBe('select $1::text, $2::text')
    expect(query.params).toEqual(['x', 'x'])
  })

  it('binds an undefined value as NULL instead of dropping the placeholder', () => {
    const query = dialect.sqlToQuery(bindPlaceholders('select $1::int, $2', [undefined, 'x']))
    expect(query.sql).toBe('select $1::int, $2')
    expect(query.params).toEqual([null, 'x'])
  })

  it('leaves text without placeholders untouched', () => {
    expect(dialect.sqlToQuery(bindPlaceholders('select 1', [])).sql).toBe('select 1')
  })
})
