import type { ReactNode } from 'react'
import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-3 border-b px-4 sm:px-6">
        <Brand href="/operator" />
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span className="text-sm text-muted-foreground">Operator</span>
        <LinkButton href="/" variant="ghost" size="sm" className="ml-auto">
          Back to app
        </LinkButton>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  )
}
