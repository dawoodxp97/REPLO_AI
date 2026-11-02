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
        className="text-link underline underline-offset-4"
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  code: ({ children }) => (
    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border bg-code-bg p-4 font-mono text-[13px] leading-6 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[inherit]">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 pl-4 text-muted-foreground">{children}</blockquote>
  ),
  h3: ({ children }) => (
    <h3 className="font-sans text-lg font-semibold tracking-tight">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-sans text-base font-semibold tracking-tight">{children}</h4>
  ),
}

export function SafeMarkdown({ source }: { source: string }) {
  return (
    <div className="space-y-4">
      <Markdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={COMPONENTS}
      >
        {source}
      </Markdown>
    </div>
  )
}
