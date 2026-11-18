import { Chart } from '../components/chart'
import { useSession } from '../store/session'

export function DashboardPage() {
  const email = useSession((state) => state.email)
  return <Chart points={[3, 5, 8, 13]} />
}
