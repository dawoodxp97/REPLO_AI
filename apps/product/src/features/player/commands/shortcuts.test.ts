import { describe, expect, it } from 'vitest'
import { resolveShortcut, type ShortcutEvent } from './shortcuts'

const plain: ShortcutEvent = {
  key: 'n',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  repeat: false,
  inTextEntry: false,
  inDialog: false,
}

describe('resolveShortcut', () => {
  it('maps the lesson letters', () => {
    expect(resolveShortcut(plain)).toBe('next')
    expect(resolveShortcut({ ...plain, key: 'p' })).toBe('previous')
    expect(resolveShortcut({ ...plain, key: 'r' })).toBe('nextReference')
    expect(resolveShortcut({ ...plain, key: 'm' })).toBe('toggleComplete')
  })

  it('ignores unmapped keys', () => {
    expect(resolveShortcut({ ...plain, key: 'x' })).toBeNull()
  })

  it('ignores letters while typing', () => {
    expect(resolveShortcut({ ...plain, inTextEntry: true })).toBeNull()
  })

  it('ignores letters while a dialog is open', () => {
    expect(resolveShortcut({ ...plain, inDialog: true })).toBeNull()
  })

  it('ignores held keys so m cannot repeat', () => {
    expect(resolveShortcut({ ...plain, key: 'm', repeat: true })).toBeNull()
  })

  it('ignores letters with a modifier', () => {
    expect(resolveShortcut({ ...plain, ctrlKey: true })).toBeNull()
    expect(resolveShortcut({ ...plain, altKey: true })).toBeNull()
  })

  it('toggles the palette from anywhere, including a text field and a dialog', () => {
    const chord = { ...plain, key: 'k', metaKey: true }
    expect(resolveShortcut(chord)).toBe('palette')
    expect(resolveShortcut({ ...chord, inTextEntry: true, inDialog: true })).toBe('palette')
    expect(resolveShortcut({ ...plain, key: 'K', metaKey: false, ctrlKey: true })).toBe('palette')
  })
})
