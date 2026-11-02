import { describe, expect, it } from 'vitest'
import { groupCommands, type PaletteItem } from './palette-items'

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
