import type { Metadata } from 'next'
import { LoginPanel } from '@/features/session/login-panel'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Sign in to Replo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use GitHub, Google or an email address and password.
        </p>
      </div>
      <LoginPanel error={error} />
    </main>
  )
}
