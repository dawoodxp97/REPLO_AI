import type { ReactNode } from 'react'
import { loadViewerSignedIn } from './overview-loader'
import { PublicTopBar } from './public-top-bar'

export async function TutorialShell({ children }: { children: ReactNode }) {
  const signedIn = await loadViewerSignedIn()

  return (
    <div className="min-h-dvh">
      <PublicTopBar signedIn={signedIn} />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}
