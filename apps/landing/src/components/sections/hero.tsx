import { buttonVariants } from '@replo/ui'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Container } from '../page-section'
import { ProductFrame } from '../product-frame'
import { APP_URL } from '../site'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-12 pb-16 sm:pt-20 sm:pb-24">
      <Container>
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h1
              id="hero-title"
              className="heading-display max-w-2xl text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              A reading path through your code.
            </h1>
            <p className="mt-5 font-mono text-xs text-muted-foreground">
              TypeScript & JavaScript · GitHub repositories
            </p>
          </div>
          <div>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Turn an unfamiliar repository into lessons you can follow. Read the explanation beside
              the source, trace every reference to a pinned commit, and test what you’ve learned.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={`${APP_URL}/import`} className={buttonVariants({ size: 'lg' })}>
                Generate a tutorial
                <ArrowRight aria-hidden="true" />
              </a>
              <Link href="#example" className={buttonVariants({ size: 'lg', variant: 'ghost' })}>
                Explore an example
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Free to use. Bring your own model key. Your code is never executed.
            </p>
          </div>
        </div>
        <div id="example" className="mt-10 scroll-mt-24 sm:mt-14">
          <ProductFrame />
        </div>
      </Container>
    </section>
  )
}
