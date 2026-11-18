import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@replo/ui'
import { PROVIDERS } from '@/lib/providers'

export function ProviderTable() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableCaption className="sr-only">Supported providers</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="px-4">
              Provider
            </TableHead>
            <TableHead scope="col" className="px-4">
              Notes
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PROVIDERS.map((provider) => (
            <TableRow key={provider.name}>
              <TableHead
                scope="row"
                className="h-auto px-4 py-3 align-top whitespace-normal text-foreground"
              >
                <a href={provider.href} className="link-inline">
                  {provider.name}
                </a>
                {provider.recommended ? (
                  <Badge variant="secondary" className="ml-2">
                    Recommended
                  </Badge>
                ) : null}
              </TableHead>
              <TableCell className="px-4 py-3 align-top whitespace-normal text-muted-foreground">
                {provider.note}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
