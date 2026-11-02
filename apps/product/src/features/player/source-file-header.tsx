import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@replo/ui'
import { ExternalLink } from 'lucide-react'
import { Fragment } from 'react'
import { shortSha } from '@/lib/format'

export interface SourceFileHeaderProps {
  path: string
  commitSha: string
  githubHref: string
}

export function SourceFileHeader({ path, commitSha, githubHref }: SourceFileHeaderProps) {
  const segments = path.split('/')
  const last = segments.length - 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <Breadcrumb aria-label="File path" className="min-w-0">
        <BreadcrumbList className="gap-1 font-mono text-xs break-all">
          {segments.map((segment, index) => (
            <Fragment key={`${index}-${segment}`}>
              <BreadcrumbItem>
                {index === last ? <BreadcrumbPage>{segment}</BreadcrumbPage> : segment}
              </BreadcrumbItem>
              {index < last ? <BreadcrumbSeparator /> : null}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono text-muted-foreground" title="Pinned commit">
          {shortSha(commitSha)}
        </span>
        <a
          href={githubHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-link underline-offset-4 hover:underline"
        >
          Open on GitHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
