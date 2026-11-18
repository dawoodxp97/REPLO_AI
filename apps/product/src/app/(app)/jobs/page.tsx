import type { Metadata } from 'next'
import { ActiveGenerations } from '@/features/jobs/active-generations'

export const metadata: Metadata = { title: 'Generations' }

export default function GenerationsRoute() {
  return <ActiveGenerations />
}
