import { createBrowserRouter, RouterProvider } from 'react-router'
import { Home } from './pages/Home'
import { TaskPage } from './pages/TaskPage'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/tasks/:taskId', element: <TaskPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}
