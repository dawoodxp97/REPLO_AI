import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell/app-shell'
import { AuthGate } from '@/features/session/auth-gate'
import { ThemeSync } from '@/features/session/theme-sync'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <ThemeSync />
      <AppShell>{children}</AppShell>
    </AuthGate>
  )
}
