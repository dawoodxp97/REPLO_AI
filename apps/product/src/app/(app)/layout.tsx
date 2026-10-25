import type { ReactNode } from 'react'
import { AppNav } from '@/components/app-nav'
import { AuthGate } from '@/features/session/auth-gate'
import { ThemeSync } from '@/features/session/theme-sync'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <ThemeSync />
      <div className="flex min-h-dvh flex-col">
        <AppNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthGate>
  )
}
