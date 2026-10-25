import Link from 'next/link'
import type { ReactNode } from 'react'

export const linkClass = 'font-medium text-primary underline underline-offset-4 hover:no-underline'

export const bulletListClass = 'list-disc space-y-2 pl-5'

export const numberedListClass = 'list-decimal space-y-2 pl-5'

export const tableCellClass = 'border-t border-border px-3 py-2 align-top'

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
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
      {notice}
      <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      {lede ? <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{lede}</p> : null}
      <div className="text-base leading-7">{children}</div>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 space-y-4">
      <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}

export function DraftNotice() {
  return (
    <p
      role="note"
      className="mb-8 rounded-md border border-interpretation bg-interpretation/10 px-4 py-3 text-sm font-medium"
    >
      Draft. Reviewed before launch.
    </p>
  )
}

export function NextLinks({ links }: { links: readonly { href: string; title: string }[] }) {
  return (
    <nav aria-label="Related pages" className="mt-14 border-t border-border pt-6">
      <ul className={bulletListClass}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={linkClass}>
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
