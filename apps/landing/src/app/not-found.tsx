import type { Metadata } from 'next'
import Link from 'next/link'
import { Article, bulletListClass, linkClass, Section } from '@/components/article'
import { DOCS_INDEX, KEY_GUIDE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <Article title="Page not found" lede="This page does not exist, or it has moved.">
      <Section title="Where to go">
        <ul className={bulletListClass}>
          <li>
            <Link href="/" className={linkClass}>
              Home
            </Link>
          </li>
          <li>
            <Link href={DOCS_INDEX.href} className={linkClass}>
              {DOCS_INDEX.title}
            </Link>
          </li>
          <li>
            <Link href={KEY_GUIDE.href} className={linkClass}>
              {KEY_GUIDE.title}
            </Link>
          </li>
        </ul>
      </Section>
    </Article>
  )
}
