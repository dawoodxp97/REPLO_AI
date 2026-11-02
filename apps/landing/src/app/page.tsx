import { ClosingCta } from '@/components/sections/closing-cta'
import { Faq } from '@/components/sections/faq'
import { Grounding } from '@/components/sections/grounding'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { KeyProviders } from '@/components/sections/key-providers'

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <HowItWorks />
      <Grounding />
      <KeyProviders />
      <Faq />
      <ClosingCta />
    </main>
  )
}
