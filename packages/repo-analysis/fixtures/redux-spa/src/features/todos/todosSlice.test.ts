import { describe, expect, it } from 'vitest'
import { todosReducer, toggleTodo, todosLoaded } from './todosSlice'

describe('todos', () => {
  it('toggles one item', () => {
    const state = todosReducer([{ id: 1, title: 'a', done: false }], toggleTodo(1))
    expect(state[0]?.done).toBe(true)
  })

  it('replaces the list on load', () => {
    expect(todosReducer([], todosLoaded([{ id: 2, title: 'b', done: false }]))).toHaveLength(1)
  })
})
