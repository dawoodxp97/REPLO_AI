import Link from 'next/link'
import { KEY_GUIDE } from '@/lib/routes'
import { PageSection } from '../page-section'
import { ProviderTable } from '../provider-table'

export function KeyProviders() {
  return (
    <PageSection
      id="keys"
      title="Your key, your bill"
      lede="Replo charges nothing and never pays for your AI. Every course runs on a key you own. Each run is capped by a token ceiling on the server, and a failing key never falls back to another."
    >
      <div className="max-w-3xl">
        <ProviderTable />
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Keys are stored encrypted and shown only as their last four characters.{' '}
          <Link href={KEY_GUIDE.href} className="link-inline">
            Read the key guide
          </Link>
        </p>
      </div>
    </PageSection>
  )
}
