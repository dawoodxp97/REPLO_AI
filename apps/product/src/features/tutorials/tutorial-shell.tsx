import { cn } from '@replo/ui'
import type { ReactNode } from 'react'
import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'
import { loadViewerSignedIn } from './overview-loader'

export async function TutorialShell({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  const signedIn = await loadViewerSignedIn()
  const width = wide ? 'max-w-6xl' : 'max-w-4xl'

  return (
    <div className="min-h-dvh">
      <PublicTopBar signedIn={signedIn} width={width} />
      <main className={cn('mx-auto w-full px-4 py-10 sm:px-6', width)}>{children}</main>
    </div>
  )
}

function PublicTopBar({
  signedIn,
  width = 'max-w-4xl',
}: {
  signedIn: boolean
  width?: 'max-w-4xl' | 'max-w-6xl'
}) {
  return (
    <header className="border-b bg-background">
      <div
        className={cn(
          'mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6',
          width,
        )}
      >
        <Brand />
        {signedIn ? (
          <LinkButton href="/" variant="outline" size="sm">
            Open app
          </LinkButton>
        ) : (
          <LinkButton href="/login" variant="outline" size="sm">
            Sign in
          </LinkButton>
        )}
      </div>
    </header>
  )
}
