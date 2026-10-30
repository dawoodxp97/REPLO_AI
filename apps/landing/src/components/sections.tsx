import { Badge, buttonVariants, Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { linkClass } from './article'
import { APP_URL } from './site'

const wrap = 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'

export function Hero() {
  return (
    <section
      className={`${wrap} grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center`}
    >
      <div>
        <Badge variant="neutral" className="mb-5">
          Free to use · bring your own key
        </Badge>
        <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-[-0.02em] sm:text-6xl">
          Learn a GitHub repo, <em className="text-primary">with receipts.</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Paste a repo and get a chaptered tutorial. Every explanation links to the exact file and
          lines at a pinned commit. A checker tests those links before you read them, and removes or
          downgrades any it cannot find.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={`${APP_URL}/import`} className={buttonVariants({ size: 'lg' })}>
            Generate a tutorial for your repo
          </a>
          <Link
            href="/docs/grounding/"
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            How grounding is checked
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Read-only GitHub access. Your repo’s code is never executed.
        </p>
      </div>
      <LessonPreview />
    </section>
  )
}

function LessonPreview() {
  return (
    <figure className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm">
      <figcaption className="mb-4 space-y-1 text-xs text-muted-foreground">
        <span className="block font-medium uppercase tracking-wide text-foreground">
          Example, not a real tutorial
        </span>
        <span className="block">Chapter 3 · What happens on “Add to cart”</span>
      </figcaption>
      <p className="prose-lesson text-[1.0625rem]">
        The button dispatches the{' '}
        <code className="rounded bg-muted px-1 font-mono text-sm">addItem</code> thunk instead of
        calling the API directly, so every cart change flows through the store.
      </p>
      <p className="mt-2 flex flex-wrap gap-2">
        <Badge variant="observed" className="font-mono">
          src/cart/thunks.ts:L9–27
        </Badge>
        <Badge variant="observed" className="font-mono">
          src/ui/ProductCard.tsx:L18–22
        </Badge>
      </p>
      <div className="mt-5 rounded-r-md border-l-4 border-interpretation bg-interpretation/10 px-4 py-3">
        <Badge variant="interpretation" className="mb-2 h-auto whitespace-normal rounded-md">
          Interpretation — not confirmed by the code
        </Badge>
        <p className="prose-lesson text-[1.0625rem]">
          Routing writes through a thunk probably keeps optimistic-update logic in one place. The
          code does not say so.
        </p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Green chips are references the checker resolved. Amber marks interpretation.
      </p>
    </figure>
  )
}

const STEPS = [
  {
    n: '01',
    title: 'Paste a repo',
    body: 'A public GitHub URL, or a private repo through a read-only GitHub App you install on the repos you choose. A pre-flight check, which uses no AI, tells you what Replo will do, or why it cannot.',
  },
  {
    n: '02',
    title: 'Bring your key',
    body: 'Add an OpenRouter key (recommended), or an OpenAI, Google AI Studio or Anthropic key. Before the run starts you see the model and an estimated cost. The bill is your provider’s.',
  },
  {
    n: '03',
    title: 'Learn it in order',
    body: 'Chapters with objectives and prerequisites. On wide screens the lesson sits beside the pinned source, and a short quiz closes each chapter.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className={`${wrap} py-16`}>
      <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
        A path, not a map.
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Reference wikis answer questions about a codebase. Replo gives you an order to read it in:
        where to start, what to read next, and how to check that you understood.
      </p>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <Card className="h-full">
              <CardHeader>
                <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}

const GROUNDING = [
  {
    title: 'The model points, the system quotes',
    body: 'Models never write code or line numbers into a tutorial. They name a symbol or quote a short anchor. The validator resolves that to a file, a line range and the pinned commit, and inserts the excerpt itself.',
  },
  {
    title: 'Every reference is checked',
    body: 'Paths, symbols, quoted text, identifiers and diagram steps are checked against the pinned snapshot. A reference that fails is dropped, repaired once, or its claim is downgraded.',
  },
  {
    title: 'Honest about uncertainty',
    body: 'A claim the code does not confirm is labelled interpretation. A tutorial with weakly supported claims is published as a Draft, with a banner.',
  },
]

export function Grounding() {
  return (
    <section id="grounding" className="border-y border-border bg-muted/50 py-16">
      <div className={wrap}>
        <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
          Trust you can click.
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {GROUNDING.map((g) => (
            <div key={g.title}>
              <h3 className="font-semibold">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm">
          <Link href="/docs/grounding/" className={linkClass}>
            Read how grounding is checked
          </Link>
        </p>
      </div>
    </section>
  )
}

const KEY_PROVIDERS: { title: string; badge: string | null; body: ReactNode }[] = [
  {
    title: 'OpenRouter',
    badge: 'Recommended',
    body: (
      <>
        One key reaches many models, including <code className="font-mono">:free</code> models.
        Those have limits per OpenRouter account.
      </>
    ),
  },
  {
    title: 'OpenAI',
    badge: null,
    body: 'Works with an OpenAI API key. Stored encrypted, shown only as its last four characters.',
  },
  {
    title: 'Google AI Studio',
    badge: null,
    body: 'Works with a Google AI Studio key. Stored encrypted, shown only as its last four characters.',
  },
  {
    title: 'Anthropic',
    badge: null,
    body: 'Works with an Anthropic API key. Stored encrypted, shown only as its last four characters.',
  },
]

export function KeyProviders() {
  return (
    <section className={`${wrap} py-16`}>
      <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
        Free to use. Your key, your bill.
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Replo has no subscriptions, credits or ads, and it never pays for your AI. Every tutorial
        runs on a key you own, inside a budget you set before the run starts.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {KEY_PROVIDERS.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              {p.badge ? (
                <Badge variant="observed" className="mb-2 w-fit">
                  {p.badge}
                </Badge>
              ) : null}
              <CardTitle>{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{p.body}</CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm">
        <Link href="/keys/" className={linkClass}>
          Read the key guide
        </Link>
      </p>
    </section>
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
    <section id="faq" className={`${wrap} pb-24 pt-4`}>
      <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Questions</h2>
      <dl className="mt-8 grid max-w-3xl gap-6">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt className="font-semibold">{f.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
