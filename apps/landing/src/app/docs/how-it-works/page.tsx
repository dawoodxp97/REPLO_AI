import type { Metadata } from 'next'
import {
  Article,
  bulletListClass,
  NextLinks,
  numberedListClass,
  Section,
} from '@/components/article'
import { PIPELINE_STAGES } from '@/lib/content'
import { DOCS_INDEX, GROUNDING_PAGE, KEYS_AND_PRIVACY_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The ten stages from a repository URL to a published course, and the limits that apply along the way.',
}

export default function HowItWorksPage() {
  return (
    <Article
      title="How it works"
      lede="Replo turns a GitHub repository into a graph, a set of diagrams and a course. One committed snapshot feeds every stage, and every published reference is checked against it."
    >
      <Section title="The run">
        <p>
          A generation is ten checkpointed stages. If a stage fails or the worker stops, a retry
          resumes from the last completed stage. Paid results are saved before the stage moves on,
          so finished work is not paid for twice.
        </p>
        <ol className={numberedListClass}>
          {PIPELINE_STAGES.map((stage) => (
            <li key={stage.name}>
              <strong className="font-semibold text-foreground">{stage.name}</strong> {stage.detail}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What you get">
        <ul className={bulletListClass}>
          <li>
            A layer-grouped graph of files and symbols, with the imports, calls and inheritance
            edges between them.
          </li>
          <li>
            Guided tours that order the graph by dependency, each with an objective and steps that
            open a node or a lesson.
          </li>
          <li>
            Eight typed diagrams: architecture, tree, class, ERD, sequence, workflow, dataflow and
            lifecycle.
          </li>
          <li>
            Chapters with objectives, lessons with the pinned source beside them, and a short quiz
            after each chapter.
          </li>
          <li>
            Progress saved per course version. Stable lesson keys carry it across a rerun that
            teaches the same file.
          </li>
        </ul>
      </Section>

      <Section title="Limits and reruns">
        <ul className={bulletListClass}>
          <li>
            A repository is accepted up to about 5,000 source files and 50 MB. Files over 1 MB are
            not indexed; binaries are recorded as metadata only.
          </li>
          <li>
            The lite path applies to a free model or a repository of about 300 source files or
            fewer. It derives summaries without a model, keeps the course to five chapters, and
            builds diagrams from the graph only.
          </li>
          <li>
            Each run has a token ceiling. When it is reached the run stops with{' '}
            <code className="font-mono">RUN_LIMIT_EXCEEDED</code>. The ceiling is measured in
            tokens, not currency.
          </li>
          <li>
            A rerun takes a fresh snapshot and publishes the next course version. The previous
            version stays, and its progress remains readable.
          </li>
          <li>
            Snapshots are not tracked. There are no webhooks and no commit monitoring. A repository
            change reaches Replo only when you start a rerun.
          </li>
        </ul>
      </Section>

      <Section title="What Release 1 does not do">
        <ul className={bulletListClass}>
          <li>
            It runs no code: not your repository’s code, and not examples written in a lesson. Code
            blocks are highlighted and copyable, and they link to their source.
          </li>
          <li>
            Symbol-level edges come from TypeScript, JavaScript, TSX and JSX. Other text languages
            are taught from commit-pinned excerpts.
          </li>
          <li>It has no tutor chat, team workspaces or manual editing of a course.</li>
        </ul>
      </Section>

      <NextLinks links={[GROUNDING_PAGE, KEYS_AND_PRIVACY_PAGE, DOCS_INDEX]} />
    </Article>
  )
}
