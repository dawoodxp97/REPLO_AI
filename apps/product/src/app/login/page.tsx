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
      <aside className="hidden flex-col justify-between gap-12 border-r bg-sidebar p-10 lg:flex xl:p-16">
        <Brand />
        <div className="max-w-lg space-y-8">
          <div className="space-y-5">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight text-balance xl:text-5xl">
              Get your bearings in any repository.
            </h2>
            <p className="max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
              Follow a learning path from the big picture to the functions that matter. Keep the
              actual source beside you as you read.
            </p>
          </div>
          <ol className="divide-y border-y text-sm">
            {[
              ['01', 'Choose a GitHub repository', 'Public, or private with read-only access.'],
              ['02', 'Set your model and budget', 'Every tutorial runs on your own key.'],
              ['03', 'Read, trace, and test', 'Lessons, pinned references, and chapter quizzes.'],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-4 py-5">
                <span className="pt-0.5 font-mono text-xs text-muted-foreground">{number}</span>
                <div className="space-y-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Every code excerpt is quoted from the source. References are checked against a pinned
          commit before you read.
        </p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-6">
        <Brand className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to Replo</h1>
            <p className="text-sm text-muted-foreground">Your repositories. Your learning path.</p>
          </div>
          <LoginPanel error={error} />
        </div>
      </main>
    </div>
  )
}
