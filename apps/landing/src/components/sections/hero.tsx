import { buttonVariants } from '@replo/ui'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Container } from '../page-section'
import { ProductFrame } from '../product-frame'
import { APP_URL } from '../site'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Container>
        <div className="max-w-3xl">
          <h1
            id="hero-title"
            className={'heading-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl'}
          >
            Learn an unfamiliar repo from a tutorial that cites its code
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            Paste a GitHub repository and get a chaptered tutorial. Every explanation links to the
            exact file and lines at a pinned commit. A checker tests those references before you
            read them, and removes or downgrades any it cannot find.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={`${APP_URL}/import`} className={buttonVariants({ size: 'lg' })}>
              Generate a tutorial
              <ArrowRight aria-hidden="true" />
            </a>
            <Link
              href="/docs/grounding/"
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              How references are checked
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Free. Runs on your own model key. Read-only GitHub access, and your repo’s code is never
            executed.
          </p>
        </div>
        <div className="mt-12 sm:mt-16">
          <ProductFrame />
        </div>
      </Container>
    </section>
  )
}
