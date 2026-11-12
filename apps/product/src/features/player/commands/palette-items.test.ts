import { describe, expect, it } from 'vitest'
import { filterCommands, groupCommands, type PaletteItem } from './palette-items'

function item(id: string, group: string): PaletteItem {
  return { id, label: id, group, run: () => undefined }
}

describe('groupCommands', () => {
  it('groups items in first-seen order and keeps item order inside a group', () => {
    const groups = groupCommands([item('a', 'Lessons'), item('b', 'Actions'), item('c', 'Lessons')])
    expect(groups.map((group) => group.name)).toEqual(['Lessons', 'Actions'])
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'c'])
  })

  it('returns no groups for no items', () => {
    expect(groupCommands([])).toEqual([])
  })
})

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
