import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@replo/ui'
import Link from 'next/link'
import { PROVIDERS } from '@/lib/providers'
import { PageSection } from '../page-section'

export function KeyProviders() {
  return (
    <PageSection
      id="keys"
      title="Your key, your bill"
      lede="Replo has no subscriptions, credits or ads, and it never pays for your AI. Every tutorial runs on a key you own, inside a budget you set before the run starts."
    >
      <div className="max-w-3xl overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Provider</TableHead>
              <TableHead className="px-4">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PROVIDERS.map((provider) => (
              <TableRow key={provider.name}>
                <TableCell className="px-4 py-3 align-top font-medium">
                  <span className="whitespace-nowrap">{provider.name}</span>
                  {provider.recommended ? (
                    <Badge
                      variant="secondary"
                      className="mt-1 flex w-fit sm:mt-0 sm:ml-2 sm:inline-flex"
                    >
                      Recommended
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 py-3 align-top text-muted-foreground">
                  {provider.note}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Keys are stored encrypted and shown only as their last four characters.{' '}
        <Link href="/keys/" className="link-inline">
          Read the key guide
        </Link>
      </p>
    </PageSection>
  )
}
