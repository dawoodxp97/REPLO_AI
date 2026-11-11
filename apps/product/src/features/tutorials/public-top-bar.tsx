import { cn } from '@replo/ui'
import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'

export function PublicTopBar({
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
