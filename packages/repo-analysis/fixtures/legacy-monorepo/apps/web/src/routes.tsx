import { DashboardPage } from './pages/dashboard'
import { LoginPage } from './pages/login'
import { ReportsPage } from './pages/reports'

export const routes = [
  { path: '/login', element: LoginPage },
  { path: '/', element: DashboardPage },
  { path: '/reports', element: ReportsPage },
]
