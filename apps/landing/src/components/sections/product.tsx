import { PILLARS } from '@/lib/content'
import { PageSection } from '../page-section'
import { PointList } from '../point-list'

export function Product() {
  return (
    <PageSection
      id="product"
      title="One snapshot, three ways to read it"
      lede="The graph holds the structure. The diagrams show a slice of it. The course puts it in reading order and writes the lessons."
    >
      <PointList points={PILLARS} className="md:grid-cols-3" />
    </PageSection>
  )
}
