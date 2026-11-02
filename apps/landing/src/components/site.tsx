import { buttonVariants } from '@replo/ui'
import Link from 'next/link'
import { DOCS_INDEX, HOME_ANCHORS, KEY_GUIDE, POLICY_PAGES } from '@/lib/routes'
import { Brand } from './brand'
import { Container } from './page-section'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

export const LOGIN_URL = `${APP_URL}/login`

const PRIMARY_LINKS = [HOME_ANCHORS.how, HOME_ANCHORS.checks, KEY_GUIDE, DOCS_INDEX] as const

const navLinkClass = 'rounded-sm transition-colors hover:text-foreground'

function PrimaryNav({ className }: { className: string }) {
  return (
    <nav aria-label="Primary" className={className}>
      {PRIMARY_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={navLinkClass}>
          {link.title}
        </Link>
      ))}
    </nav>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-sm">
      <Container className="flex h-14 items-center gap-6">
        <Brand />
        <PrimaryNav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <a
            href={LOGIN_URL}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'max-[359px]:hidden',
            })}
          >
            Sign in
          </a>
          <a href={LOGIN_URL} className={buttonVariants({ size: 'sm' })}>
            Get started
          </a>
        </div>
      </Container>
      <Container className="md:hidden">
        <PrimaryNav className="scrollbar-thin -mt-1 flex h-10 items-center gap-5 overflow-x-auto text-compact whitespace-nowrap [&_a]:py-2.5 text-muted-foreground" />
      </Container>
    </header>
  )
}

const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [HOME_ANCHORS.how, HOME_ANCHORS.checks, KEY_GUIDE, DOCS_INDEX, HOME_ANCHORS.faq],
  },
  { title: 'Policies', links: POLICY_PAGES },
] as const

export function Footer() {
  return (
    <footer className="border-t text-sm text-muted-foreground">
      <Container className="grid gap-10 py-12 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-16">
        <div className="space-y-3">
          <Brand className="text-foreground" />
          <p className="max-w-xs leading-relaxed">
            Grounded tutorials for GitHub repositories. Free for individual developers, on your own
            model key.
          </p>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="space-y-3">
            <p className="font-medium text-foreground">{group.title}</p>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={navLinkClass}>
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
    </footer>
  )
}
