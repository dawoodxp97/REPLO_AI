import type { Metadata } from 'next'
import { SignInButton } from './sign-in-button'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Sign in to Replo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          GitHub sign-in only. We request no extra scopes; private repos need a separate read-only
          app install.
        </p>
      </div>
      <SignInButton />
    </main>
  )
}
