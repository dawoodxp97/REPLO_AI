import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col px-4 py-8 sm:px-6">
      <Brand />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div className="space-y-1.5">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">This page could not be found</h1>
          <p className="text-sm text-muted-foreground">
            The link may be wrong, or the page may be private to another account.
          </p>
        </div>
        <div>
          <LinkButton href="/" variant="outline">
            Back to your dashboard
          </LinkButton>
        </div>
      </div>
    </main>
  )
}
