import { cn } from '@replo/ui'
import type { ComponentProps, ReactNode } from 'react'

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...props} />
  )
}

export function PageSection({
  id,
  title,
  lede,
  className,
  children,
}: {
  id: string
  title: string
  lede?: ReactNode
  className?: string
  children: ReactNode
}) {
  const headingId = `${id}-title`
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('scroll-mt-20 border-t py-16 sm:py-24', className)}
    >
      <Container>
        <h2 id={headingId} className={'heading-display max-w-2xl text-2xl sm:text-3xl'}>
          {title}
        </h2>
        {lede ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground">
            {lede}
          </p>
        ) : null}
        <div className="mt-10 sm:mt-12">{children}</div>
      </Container>
    </section>
  )
}
