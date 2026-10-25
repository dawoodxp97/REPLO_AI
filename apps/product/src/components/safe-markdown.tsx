import Markdown, { type Components } from 'react-markdown'
import { isAllowedLink } from '@/lib/safe-link'

const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'h3',
  'h4',
  'br',
] as const

const COMPONENTS: Components = {
  a: ({ href, children }) =>
    isAllowedLink(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4"
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
}

export function SafeMarkdown({ source }: { source: string }) {
  return (
    <Markdown skipHtml allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed components={COMPONENTS}>
      {source}
    </Markdown>
  )
}
