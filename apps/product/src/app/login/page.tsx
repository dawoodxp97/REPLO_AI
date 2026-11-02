import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { LoginPanel } from '@/features/session/login-panel'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between border-r bg-muted/40 p-10 lg:flex">
        <Brand />
        <p className="max-w-sm text-sm text-pretty text-muted-foreground">
          Chaptered tutorials for any GitHub repository. Every code excerpt is quoted from the
          source, never written by a model.
        </p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-6">
        <Brand className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to Replo</h1>
            <p className="text-sm text-muted-foreground">
              Use GitHub, Google or an email address and password.
            </p>
          </div>
          <LoginPanel error={error} />
        </div>
      </main>
    </div>
  )
}
