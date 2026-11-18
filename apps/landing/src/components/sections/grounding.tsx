import Link from 'next/link'
import { GROUNDING_PAGE } from '@/lib/routes'
import { CheckList } from '../check-list'
import { PageSection } from '../page-section'

export function Grounding() {
  return (
    <PageSection
      id="checks"
      title="The model points, the system quotes"
      lede="A model names a symbol or quotes a short anchor. It never writes the code or the line numbers. The checker resolves each reference to a file, a range and a blob SHA at the pinned commit, then inserts the excerpt itself."
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="max-w-xl space-y-4 leading-relaxed text-pretty text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">Observed claims</strong> carry at
            least one checked reference. A claim the code does not confirm is labelled
            interpretation and rendered differently.
          </p>
          <p>
            On failure the reference is dropped, the lesson gets one repair, and anything still
            failing is downgraded or removed. A course with weak coverage publishes as a Draft, with
            a banner.
          </p>
          <p>
            Confidence is the deterministic share of observed claims that kept their evidence. It is
            not a model’s opinion of its own work.
          </p>
          <p>
            <Link href={GROUNDING_PAGE.href} className="link-inline">
              Read how grounding is checked
            </Link>
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-mono text-xs font-medium text-foreground">Checks</h3>
          <CheckList />
        </div>
      </div>
    </PageSection>
  )
}
