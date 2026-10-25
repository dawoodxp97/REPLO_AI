import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../app/store'
import { toggleTodo } from '../features/todos/todosSlice'

export function TodoList() {
  const todos = useSelector((state: RootState) => state.todos)
  const dispatch = useDispatch()
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} onClick={() => dispatch(toggleTodo(todo.id))}>
          {todo.title}
        </li>
      ))}
    </ul>
  )
}
