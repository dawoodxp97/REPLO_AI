import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'

export function PublicTopBar({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
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
