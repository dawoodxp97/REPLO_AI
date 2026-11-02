import { cn, CodePanel, CodePanelHeader, MonoLabel } from '@replo/ui'
import Link from 'next/link'
import { REPORT, REPORT_STATUS_STYLE } from '@/lib/content'
import { PageSection } from '../page-section'

function CheckerReport() {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 text-xs text-muted-foreground">
        Example checker report, not a real tutorial
      </figcaption>
      <CodePanel className="overflow-hidden font-sans">
        <CodePanelHeader>
          <MonoLabel className="text-xs text-foreground">validation report</MonoLabel>
          <MonoLabel>snapshot @3b17b2e</MonoLabel>
        </CodePanelHeader>
        <ul className="scrollbar-thin overflow-x-auto py-2 font-mono text-compact leading-6">
          {REPORT.map((entry) => {
            const style = REPORT_STATUS_STYLE[entry.status]
            return (
              <li key={entry.status} className="flex w-max min-w-full gap-3 px-4 py-1">
                <span aria-hidden="true" className={cn('w-4 shrink-0 text-center', style.tone)}>
                  {style.glyph}
                </span>
                <span className="w-[6.5rem] shrink-0 text-muted-foreground">{entry.status}</span>
                <span className="whitespace-pre text-foreground">{entry.detail}</span>
              </li>
            )
          })}
        </ul>
        <p className="border-t px-4 py-2.5 font-mono text-meta text-muted-foreground">
          1 resolved · 1 downgraded · 1 dropped
        </p>
      </CodePanel>
    </figure>
  )
}

export function Grounding() {
  return (
    <PageSection id="checks" title="How references are checked">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl space-y-4 leading-relaxed text-pretty text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">
              The model points, the system quotes.
            </strong>{' '}
            Models never write code or line numbers into a tutorial. They name a symbol or quote a
            short anchor. The validator resolves that to a file, a line range and the pinned commit,
            and inserts the excerpt itself.
          </p>
          <p>
            Paths, symbols, quoted text, identifiers and diagram steps are checked against the
            pinned snapshot. A reference that fails is dropped, repaired once, or its claim is
            downgraded to interpretation.
          </p>
          <p>
            A claim the code does not confirm is labelled interpretation. A tutorial with weakly
            supported claims is published as a Draft, with a banner. The checks show that a
            reference points at code that exists, not that an explanation is complete.
          </p>
          <p>
            <Link href="/docs/grounding/" className="link-inline">
              Read how grounding is checked
            </Link>
          </p>
        </div>
        <CheckerReport />
      </div>
    </PageSection>
  )
}
