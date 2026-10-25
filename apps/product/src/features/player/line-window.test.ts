import { describe, expect, it } from 'vitest'
import { lineWindow, shiftWindow } from './line-window'

describe('lineWindow', () => {
  it('shows a short file in full', () => {
    expect(lineWindow(120, 50, 1000)).toEqual({ from: 0, to: 120 })
  })

  it('places a long file window around the anchor line', () => {
    expect(lineWindow(5000, 2000, 1000)).toEqual({ from: 1750, to: 2750 })
  })

  it('keeps the window inside the file at either end', () => {
    expect(lineWindow(5000, 3, 1000)).toEqual({ from: 0, to: 1000 })
    expect(lineWindow(5000, 4999, 1000)).toEqual({ from: 4000, to: 5000 })
  })
})

describe('shiftWindow', () => {
  it('moves one window size and stops at the file edges', () => {
    expect(shiftWindow({ from: 1000, to: 2000 }, 5000, 'down')).toEqual({ from: 2000, to: 3000 })
    expect(shiftWindow({ from: 1000, to: 2000 }, 5000, 'up')).toEqual({ from: 0, to: 1000 })
    expect(shiftWindow({ from: 4000, to: 5000 }, 5000, 'down')).toEqual({ from: 4000, to: 5000 })
  })
})
