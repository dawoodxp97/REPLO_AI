import { Alert, AlertDescription, MonoLabel } from '@replo/ui'
import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const bulletListClass = 'list-disc space-y-2 pl-5 marker:text-muted-foreground'

export const numberedListClass = 'list-decimal space-y-2 pl-5 marker:text-muted-foreground'

export function Article({
  title,
  lede,
  notice,
  children,
}: {
  title: string
  lede?: ReactNode
  notice?: ReactNode
  children: ReactNode
}) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
      <div className="max-w-[68ch]">
        {notice}
        <h1 className={'heading-display text-3xl leading-[1.1] sm:text-4xl'}>{title}</h1>
        {lede ? (
          <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{lede}</p>
        ) : null}
        <div className="text-base leading-7 [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 space-y-4 border-t pt-8">
      <h2 className={'heading-display text-xl sm:text-2xl'}>{title}</h2>
      {children}
    </section>
  )
}

export function DraftNotice() {
  return (
    <Alert variant="interpretation" role="note" className="mb-8">
      <TriangleAlert aria-hidden="true" />
      <AlertDescription className="text-foreground">
        Draft. Reviewed before launch.
      </AlertDescription>
    </Alert>
  )
}

export function NextLinks({ links }: { links: readonly { href: string; title: string }[] }) {
  return (
    <nav aria-label="Related pages" className="mt-14 border-t pt-6">
      <MonoLabel className="mb-3 block">Related</MonoLabel>
      <ul className={bulletListClass}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="link-inline">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
