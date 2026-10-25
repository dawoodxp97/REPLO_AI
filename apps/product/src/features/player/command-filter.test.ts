import { describe, expect, it } from 'vitest'
import { filterCommands } from './command-filter'

const commands = [
  { id: 'next', label: 'Next lesson' },
  { id: 'previous', label: 'Previous lesson' },
  { id: 'complete', label: 'Mark lesson complete' },
]

describe('filterCommands', () => {
  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '  ')).toEqual(commands)
  })

  it('matches labels without regard to case and keeps the original objects', () => {
    expect(filterCommands(commands, 'LESSON').map((command) => command.id)).toEqual([
      'next',
      'previous',
      'complete',
    ])
    expect(filterCommands(commands, 'complete')).toEqual([
      { id: 'complete', label: 'Mark lesson complete' },
    ])
  })

  it('returns nothing when no label matches', () => {
    expect(filterCommands(commands, 'quiz')).toEqual([])
  })
})
