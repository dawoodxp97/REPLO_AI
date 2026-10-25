import { Faq, Grounding, Hero, HowItWorks, KeyProviders } from '@/components/sections'

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <HowItWorks />
      <Grounding />
      <KeyProviders />
      <Faq />
    </main>
  )
}
