import { MonoLabel } from '@replo/ui'
import { GRAPH_LAYERS, GRAPH_POINTS } from '@/lib/content'
import { PageSection } from '../page-section'
import { PointList } from '../point-list'

export function GraphExperience() {
  return (
    <PageSection
      id="graph"
      title="A graph the code supports"
      lede="The structural graph is deterministic. Tree-sitter extracts files, symbols and edges. Enrichment adds summaries, layers, domains and flows, and graph review checks that every endpoint exists."
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <PointList points={GRAPH_POINTS} className="sm:grid-cols-2" />
        <aside aria-label="Graph layers" className="h-fit rounded-lg border bg-card p-5">
          <MonoLabel className="text-xs text-foreground">Layers</MonoLabel>
          <dl className="mt-4 divide-y">
            {GRAPH_LAYERS.map((layer) => (
              <div key={layer.name} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                <dt className="font-mono text-xs">{layer.name}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{layer.detail}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </PageSection>
  )
}
