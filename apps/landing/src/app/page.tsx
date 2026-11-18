import { ClosingCta } from '@/components/sections/closing-cta'
import { DiagramExperience } from '@/components/sections/diagram-experience'
import { Faq } from '@/components/sections/faq'
import { GraphExperience } from '@/components/sections/graph-experience'
import { Grounding } from '@/components/sections/grounding'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { KeyProviders } from '@/components/sections/key-providers'
import { Product } from '@/components/sections/product'

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <Product />
      <GraphExperience />
      <DiagramExperience />
      <HowItWorks />
      <Grounding />
      <KeyProviders />
      <Faq />
      <ClosingCta />
    </main>
  )
}
