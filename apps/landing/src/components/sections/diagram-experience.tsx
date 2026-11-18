import { MonoLabel } from '@replo/ui'
import { DIAGRAM_FAMILIES, DIAGRAM_POINTS } from '@/lib/content'
import { PageSection } from '../page-section'

export function DiagramExperience() {
  return (
    <PageSection
      id="diagrams"
      title="Typed diagrams, checked against the graph"
      lede="Every diagram is a typed specification, not free-form text. The system lays it out, and every node and edge must resolve before the diagram is kept."
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {DIAGRAM_FAMILIES.map((family) => (
          <section key={family.title} aria-label={family.title}>
            <MonoLabel className="text-xs text-foreground">{family.title}</MonoLabel>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">
              {family.body}
            </p>
            <ul className="mt-6 grid gap-x-6 sm:grid-cols-2">
              {family.diagrams.map((diagram) => (
                <li key={diagram.name} className="border-t py-4">
                  <h3 className="text-sm font-semibold tracking-tight">{diagram.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {diagram.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <ul className="mt-12 grid gap-3 border-t pt-6 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
        {DIAGRAM_POINTS.map((point) => (
          <li key={point} className="flex gap-3">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-observed" />
            {point}
          </li>
        ))}
      </ul>
    </PageSection>
  )
}
