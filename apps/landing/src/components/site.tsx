import { buttonVariants } from '@replo/ui'
import Link from 'next/link'
import { DOCS_INDEX, KEY_GUIDE, POLICY_PAGES } from '@/lib/routes'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

const PRIMARY_LINKS = [
  { href: '/#how', title: 'How it works' },
  { href: '/#grounding', title: 'Grounding' },
  KEY_GUIDE,
  DOCS_INDEX,
] as const

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          Replo
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex"
        >
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.title}
            </Link>
          ))}
        </nav>
        <a href={`${APP_URL}/login`} className={buttonVariants({ size: 'sm' })}>
          Sign in with GitHub
        </a>
      </div>
    </header>
  )
}

const FOOTER_LINKS = [
  DOCS_INDEX,
  KEY_GUIDE,
  { href: '/#faq', title: 'FAQ' },
  ...POLICY_PAGES,
] as const

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-serif text-base font-semibold text-foreground">Replo</span> · for
          individual developers. No teams, no tracking.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
