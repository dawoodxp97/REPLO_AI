import type { Todo } from './todosSlice'

export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch('/api/todos')
  return response.json()
}
