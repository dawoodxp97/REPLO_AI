import Link from 'next/link'
import type { ReactNode } from 'react'

export const STEPS = [
  {
    title: 'Import',
    body: 'Paste a public GitHub URL, or install the read-only GitHub App on the private repos you choose.',
  },
  {
    title: 'Pre-flight',
    body: 'A check that uses no AI tells you what Replo will do, or why it cannot. You see the model and an estimated cost before the run starts.',
  },
  {
    title: 'Generate',
    body: 'A model plans the chapters and writes the lessons and quizzes. The checker then tests every reference against the pinned commit.',
  },
  {
    title: 'Read',
    body: 'Chapters in order, with objectives and prerequisites. On wide screens the lesson sits beside the pinned source, and a short quiz closes each chapter.',
  },
]

export type ReportStatus = 'resolved' | 'downgraded' | 'dropped'

export const REPORT: readonly { status: ReportStatus; detail: string }[] = [
  { status: 'resolved', detail: 'src/cart/thunks.ts:L9–27' },
  { status: 'downgraded', detail: 'claim about caching → interpretation' },
  { status: 'dropped', detail: 'src/utils/legacy.ts (not in snapshot)' },
]

export const REPORT_STATUS_STYLE: Record<ReportStatus, { glyph: string; tone: string }> = {
  resolved: { glyph: '✓', tone: 'text-observed-text' },
  downgraded: { glyph: '↓', tone: 'text-interpretation-text' },
  dropped: { glyph: '✕', tone: 'text-destructive' },
}

export const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Do you run my code?',
    a: 'Never. Repositories are read as data over a read-only GitHub connection. Replo does not install dependencies, build the project or run any code, including the examples the model writes.',
  },
  {
    q: 'What languages are supported?',
    a: 'Any GitHub repository with readable text files, within the size limits shown at import. Symbol-level analysis is strongest on TypeScript and JavaScript (including Next.js, React Router, Express and Fastify). Other languages are taught from pinned file excerpts.',
  },
  {
    q: 'Does Replo cost anything?',
    a: 'No. Replo has no subscriptions, credits or ads, and it is for individual developers, not teams. If you run a paid model, you pay your provider directly, within a budget you set.',
  },
  {
    q: 'Which key should I use?',
    a: 'OpenRouter, which we recommend. One key reaches many models, and its :free models have limits per OpenRouter account. OpenAI, Google AI Studio and Anthropic keys also work.',
  },
  {
    q: 'Where does my code go?',
    a: (
      <>
        To the model provider you chose, as the excerpts each step needs, under that provider’s
        terms. What we keep, and for how long, is in the{' '}
        <Link href="/privacy/" className="link-inline">
          privacy policy
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Can I use private repositories?',
    a: 'Yes. Install the read-only GitHub App on the repositories you choose (Contents and Metadata only). Your key still pays for the run.',
  },
  {
    q: 'How is this different from DeepWiki or Code Wiki?',
    a: 'Reference wikis describe a codebase. Replo orders the reading into chapters, checks each reference against the pinned code, and runs on the model you choose.',
  },
]
