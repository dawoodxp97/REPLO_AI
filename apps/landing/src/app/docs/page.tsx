import type { Metadata } from 'next'
import Link from 'next/link'
import { Article, bulletListClass, linkClass, Section } from '@/components/article'
import { DOCS_PAGES, KEY_GUIDE, POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Docs',
  description:
    'How Replo works, how it checks its claims, and how it handles your key, your code and your data.',
}

export default function DocsPage() {
  return (
    <Article
      title="Docs"
      lede="How Replo works, how it checks its claims, and how it handles your key, your code and your data."
    >
      <Section title="Guides">
        <ul className="divide-y rounded-lg border bg-card">
          {DOCS_PAGES.map((page) => (
            <li key={page.href} className="px-4 py-3">
              <Link href={page.href} className={linkClass}>
                {page.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{page.summary}</p>
            </li>
          ))}
          <li className="px-4 py-3">
            <Link href={KEY_GUIDE.href} className={linkClass}>
              {KEY_GUIDE.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              Choosing a provider, OpenRouter’s :free limits and how keys are handled.
            </p>
          </li>
        </ul>
      </Section>

      <Section title="Policies">
        <ul className={bulletListClass}>
          {POLICY_PAGES.map((page) => (
            <li key={page.href}>
              <Link href={page.href} className={linkClass}>
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </Article>
  )
}
