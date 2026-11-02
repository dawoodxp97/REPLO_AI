import { buttonVariants } from '@replo/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/article'
import { MonoLabel } from '@/components/page-section'
import { DOCS_INDEX, KEY_GUIDE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <Article title="Page not found" lede="This page does not exist, or it has moved.">
      <MonoLabel className="mt-8 block text-xs">404</MonoLabel>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          Home
        </Link>
        <Link href={DOCS_INDEX.href} className={buttonVariants({ variant: 'outline' })}>
          {DOCS_INDEX.title}
        </Link>
        <Link href={KEY_GUIDE.href} className={buttonVariants({ variant: 'outline' })}>
          {KEY_GUIDE.title}
        </Link>
      </div>
    </Article>
  )
}
