import { buttonVariants } from '@replo/ui'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { HERO_ASSURANCES } from '@/lib/content'
import { HOME_ANCHORS } from '@/lib/routes'
import { CitationLink } from '../citation-chip'
import { GraphPreview } from '../graph-preview'
import { Container } from '../page-section'
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
              A map of the codebase, then a course through it.
            </h1>
            <p className="mt-5 font-mono text-xs text-muted-foreground">
              TypeScript & JavaScript · GitHub repositories
            </p>
          </div>
          <div>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Replo reads a repository into a layer-grouped graph, typed diagrams and a chaptered
              course. Every observed claim points at the commit-pinned code it describes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={`${APP_URL}/import`} className={buttonVariants({ size: 'lg' })}>
                Generate a course
                <ArrowRight aria-hidden="true" />
              </a>
              <Link
                href={HOME_ANCHORS.how.href}
                className={buttonVariants({ size: 'lg', variant: 'ghost' })}
              >
                {HOME_ANCHORS.how.title}
              </Link>
            </div>
            <ul className="mt-5 flex flex-col gap-1.5 text-xs text-muted-foreground">
              {HERO_ASSURANCES.map(({ claim, source, href }) => (
                <li key={href} className="flex flex-wrap items-center gap-2">
                  {claim}
                  <CitationLink href={href} label={`${claim}: read ${source}`}>
                    {source}
                  </CitationLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 sm:mt-14">
          <GraphPreview />
        </div>
      </Container>
    </section>
  )
}
