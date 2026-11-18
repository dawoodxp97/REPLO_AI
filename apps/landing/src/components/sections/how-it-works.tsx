import { MonoLabel } from '@replo/ui'
import { STEPS } from '@/lib/content'
import { PageSection } from '../page-section'

export function HowItWorks() {
  return (
    <PageSection id="how" title="How it works">
      <ol className="grid sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative border-l pb-10 pl-6 last:pb-0 sm:border-t sm:border-l-0 sm:pt-6 sm:pr-6 sm:pb-0 sm:pl-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1.5 left-0 size-2 -translate-x-1/2 rounded-full bg-foreground sm:top-0 sm:-translate-y-1/2 sm:translate-x-0"
            />
            <MonoLabel className="text-xs">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <h3 className="mt-1 font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </PageSection>
  )
}
