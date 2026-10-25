import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Todo {
  id: number
  title: string
  done: boolean
}

const slice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    todosLoaded(_state, action: PayloadAction<Todo[]>) {
      return action.payload
    },
    toggleTodo(state, action: PayloadAction<number>) {
      const todo = state.find((item) => item.id === action.payload)
      if (todo) todo.done = !todo.done
    },
  },
})

export const { todosLoaded, toggleTodo } = slice.actions
export const todosReducer = slice.reducer
