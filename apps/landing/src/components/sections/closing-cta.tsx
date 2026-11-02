import { buttonVariants } from '@replo/ui'
import { ArrowRight } from 'lucide-react'
import { Container } from '../page-section'
import { LOGIN_URL } from '../site'

export function ClosingCta() {
  return (
    <section aria-label="Get started" className="border-t py-12 sm:py-16">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className={'heading-display max-w-xl text-xl sm:text-2xl'}>
          Sign in, add a key and generate your first tutorial.
        </p>
        <a href={LOGIN_URL} className={buttonVariants({ size: 'lg', className: 'self-start' })}>
          Get started
          <ArrowRight aria-hidden="true" />
        </a>
      </Container>
    </section>
  )
}
