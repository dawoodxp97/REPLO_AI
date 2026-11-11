import { cn } from '@replo/ui'
import type { ReactNode } from 'react'
import { loadViewerSignedIn } from './overview-loader'
import { PublicTopBar } from './public-top-bar'

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
