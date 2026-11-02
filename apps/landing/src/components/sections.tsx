import {
  Badge,
  buttonVariants,
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@replo/ui'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { linkClass } from './article'
import { Container, displayClass, MonoLabel, PageSection } from './page-section'
import { ProductFrame } from './product-frame'
import { APP_URL, LOGIN_URL } from './site'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Container>
        <div className="max-w-3xl">
          <h1
            id="hero-title"
            className={cn(displayClass, 'text-4xl leading-[1.05] sm:text-5xl lg:text-6xl')}
          >
            Learn an unfamiliar repo from a tutorial that cites its code
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            Paste a GitHub repository and get a chaptered tutorial. Every explanation links to the
            exact file and lines at a pinned commit. A checker tests those references before you
            read them, and removes or downgrades any it cannot find.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={`${APP_URL}/import`} className={buttonVariants({ size: 'lg' })}>
              Generate a tutorial
              <ArrowRight aria-hidden="true" />
            </a>
            <Link
              href="/docs/grounding/"
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              How references are checked
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Free. Runs on your own model key. Read-only GitHub access, and your repo’s code is never
            executed.
          </p>
        </div>
        <div className="mt-12 sm:mt-16">
          <ProductFrame />
        </div>
      </Container>
    </section>
  )
}

const STEPS = [
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

export function HowItWorks() {
  return (
    <PageSection
      id="how"
      title="From a repo URL to a chaptered tutorial in four steps"
      lede="Replo gives you an order to read a codebase in: where to start, what to read next, and how to check that you understood."
    >
      <ol className="grid lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative border-l pb-10 pl-6 last:pb-0 lg:border-t lg:border-l-0 lg:pt-6 lg:pr-8 lg:pb-0 lg:pl-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[4.5px] size-2 rounded-full bg-foreground lg:-top-[4.5px] lg:left-0"
            />
            <MonoLabel className="text-xs">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <h3 className="mt-1 font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </PageSection>
  )
}

type ReportEntry = {
  glyph: string
  status: string
  detail: string
  tone: string
}

const REPORT: readonly ReportEntry[] = [
  {
    glyph: '✓',
    status: 'resolved',
    detail: 'src/cart/thunks.ts:L9–27',
    tone: 'text-observed-text',
  },
  {
    glyph: '↓',
    status: 'downgraded',
    detail: 'claim about caching → interpretation',
    tone: 'text-interpretation-text',
  },
  {
    glyph: '✕',
    status: 'dropped',
    detail: 'src/utils/legacy.ts (not in snapshot)',
    tone: 'text-destructive',
  },
]

function CheckerReport() {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 text-xs text-muted-foreground">
        Example checker report, not a real tutorial
      </figcaption>
      <div className="overflow-hidden rounded-xl border bg-code-bg">
        <div className="flex h-10 items-center justify-between gap-3 border-b px-4">
          <MonoLabel className="text-xs text-foreground">validation report</MonoLabel>
          <MonoLabel>snapshot @3b17b2e</MonoLabel>
        </div>
        <ul className="scrollbar-thin overflow-x-auto py-2 font-mono text-[0.8125rem] leading-6">
          {REPORT.map((entry) => (
            <li key={entry.status} className="flex w-max min-w-full gap-3 px-4 py-1">
              <span aria-hidden="true" className={cn('w-4 shrink-0 text-center', entry.tone)}>
                {entry.glyph}
              </span>
              <span className="w-[6.5rem] shrink-0 text-muted-foreground">{entry.status}</span>
              <span className="whitespace-pre text-foreground">{entry.detail}</span>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-2.5 font-mono text-[0.6875rem] text-muted-foreground">
          1 resolved · 1 downgraded · 1 dropped
        </p>
      </div>
    </figure>
  )
}

export function Grounding() {
  return (
    <PageSection id="checks" title="How references are checked">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl space-y-4 leading-relaxed text-pretty text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">
              The model points, the system quotes.
            </strong>{' '}
            Models never write code or line numbers into a tutorial. They name a symbol or quote a
            short anchor. The validator resolves that to a file, a line range and the pinned commit,
            and inserts the excerpt itself.
          </p>
          <p>
            Paths, symbols, quoted text, identifiers and diagram steps are checked against the
            pinned snapshot. A reference that fails is dropped, repaired once, or its claim is
            downgraded to interpretation.
          </p>
          <p>
            A claim the code does not confirm is labelled interpretation. A tutorial with weakly
            supported claims is published as a Draft, with a banner. The checks show that a
            reference points at code that exists, not that an explanation is complete.
          </p>
          <p>
            <Link href="/docs/grounding/" className={linkClass}>
              Read how grounding is checked
            </Link>
          </p>
        </div>
        <CheckerReport />
      </div>
    </PageSection>
  )
}

const KEY_PROVIDERS: { name: string; recommended?: boolean; note: ReactNode }[] = [
  {
    name: 'OpenRouter',
    recommended: true,
    note: (
      <>
        One key reaches many models, including <code className="font-mono">:free</code> models,
        which have limits per OpenRouter account.
      </>
    ),
  },
  { name: 'OpenAI', note: 'Works with an OpenAI API key.' },
  { name: 'Google AI Studio', note: 'Works with a Google AI Studio key.' },
  { name: 'Anthropic', note: 'Works with an Anthropic API key.' },
]

export function KeyProviders() {
  return (
    <PageSection
      id="keys"
      title="Your key, your bill"
      lede="Replo has no subscriptions, credits or ads, and it never pays for your AI. Every tutorial runs on a key you own, inside a budget you set before the run starts."
    >
      <div className="max-w-3xl overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Provider</TableHead>
              <TableHead className="px-4">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {KEY_PROVIDERS.map((provider) => (
              <TableRow key={provider.name}>
                <TableCell className="px-4 py-3 align-top font-medium whitespace-nowrap">
                  {provider.name}
                  {provider.recommended ? (
                    <Badge variant="secondary" className="ml-2">
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
        <Link href="/keys/" className={linkClass}>
          Read the key guide
        </Link>
      </p>
    </PageSection>
  )
}

const FAQ: { q: string; a: ReactNode }[] = [
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
    a: 'No. Replo has no subscriptions, credits or ads. If you run a paid model, you pay your provider directly, within a budget you set.',
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
        <Link href="/privacy/" className={linkClass}>
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
  {
    q: 'Is there a team plan?',
    a: 'No. Replo is for individual developers.',
  },
]

export function Faq() {
  return (
    <PageSection id="faq" title="Questions">
      <div className="max-w-3xl border-t">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-medium tracking-tight [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="max-w-[68ch] pb-5 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </PageSection>
  )
}

export function ClosingCta() {
  return (
    <section aria-label="Get started" className="border-t py-12 sm:py-16">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn(displayClass, 'max-w-xl text-xl sm:text-2xl')}>
          Sign in, add a key and generate your first tutorial.
        </p>
        <a href={LOGIN_URL} className={buttonVariants({ size: 'lg', className: 'self-start' })}>
          Get started
          <ArrowRight aria-hidden="true" />
        </a>
      </Container>
    </section>
  )
}
