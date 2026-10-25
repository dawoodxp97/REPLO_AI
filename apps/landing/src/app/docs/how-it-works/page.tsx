import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Article,
  bulletListClass,
  linkClass,
  NextLinks,
  numberedListClass,
  Section,
} from '@/components/article'
import { DOCS_INDEX, DOCS_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'From a repo URL to a chaptered tutorial: pre-flight, reading, static analysis, chapters, checks and publishing.',
}

export default function HowItWorksPage() {
  return (
    <Article
      title="How it works"
      lede="Replo turns a TypeScript or JavaScript repository into a chaptered tutorial. It reads the code, plans the chapters, writes the lessons and checks every reference before anything is published."
    >
      <Section title="From URL to tutorial">
        <ol className={numberedListClass}>
          <li>
            <strong className="font-semibold text-foreground">Pre-flight.</strong> Replo reads the
            repository’s file list through GitHub’s API and checks its size and languages. This step
            uses no AI. A repo that is too large, or that is not TypeScript or JavaScript, is
            refused, and the reason is shown.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Read.</strong> The import is pinned to
            one commit. Replo streams the repository archive and keeps the text of readable files.
            Binary files, Git LFS files and files over 1 MB are not kept.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Index.</strong> Replo parses the code
            with tree-sitter to find files, symbols, imports and entry points. This is static
            analysis. Replo does not install dependencies, run a type checker, or resolve every
            call. Where the index cannot be sure, a reference is marked unverified, not proven.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Plan and write.</strong> A model plans
            five to eight chapters, each with objectives and prerequisites. It then writes the
            lessons and quiz questions, chapter by chapter. Each finished chapter is saved, so a
            failed job resumes from the last saved chapter.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Check and publish.</strong> Every
            reference is checked against the pinned commit. Claims that fail are removed or
            downgraded. A tutorial with weak support is published as a Draft.{' '}
            <Link href="/docs/grounding/" className={linkClass}>
              How the checks work
            </Link>
            .
          </li>
        </ol>
      </Section>

      <Section title="What you get">
        <ul className={bulletListClass}>
          <li>Chapters in order, each with objectives and prerequisites.</li>
          <li>
            Lessons with the source beside them. The code is pinned to the commit, and each
            reference links to its lines.
          </li>
          <li>
            An architecture diagram. Structural diagrams come from the code index, not from the
            model.
          </li>
          <li>A short quiz at the end of each chapter, built from the repository’s code.</li>
          <li>Progress saved to your account, so you can pick up where you stopped.</li>
        </ul>
      </Section>

      <Section title="What release 1 does not do">
        <ul className={bulletListClass}>
          <li>
            It runs no code: not your repository’s code, and not the examples the model writes. Code
            blocks are highlighted and copyable, and they link to their source.
          </li>
          <li>It supports TypeScript and JavaScript only.</li>
          <li>
            It does not regenerate a tutorial automatically. If a file a tutorial cites changes on
            the default branch, the tutorial is marked stale.
          </li>
          <li>It has no tutor chat, no team workspaces and no manual editing of tutorials.</li>
        </ul>
      </Section>

      <NextLinks links={[DOCS_PAGES[1], DOCS_PAGES[2], DOCS_INDEX]} />
    </Article>
  )
}
