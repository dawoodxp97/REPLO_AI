import { ChevronDown } from 'lucide-react'
import { FAQ } from '@/lib/content'
import { PageSection } from '../page-section'

export function Faq() {
  return (
    <PageSection id="faq" title="Questions">
      <div className="max-w-3xl border-t">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-medium tracking-tight hover:text-foreground [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="max-w-[68ch] pb-5 text-sm leading-relaxed text-foreground/80">{item.a}</p>
          </details>
        ))}
      </div>
    </PageSection>
  )
}
