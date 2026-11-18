import type { Metadata } from 'next'
import {
  Article,
  bulletListClass,
  numberedListClass,
  NextLinks,
  Section,
} from '@/components/article'
import { CheckList } from '@/components/check-list'
import { DOCS_INDEX, HOW_IT_WORKS_PAGE, KEYS_AND_PRIVACY_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'How grounding is checked',
  description:
    'How Replo ties each explanation and diagram to pinned code, what the checks test, and what they do not prove.',
}

export default function GroundingPage() {
  return (
    <Article
      title="How grounding is checked"
      lede="A course is only useful if you can check it. Replo separates what the code shows from what the model thinks it means, and checks every reference the model makes."
    >
      <Section title="The model points, the system quotes">
        <p>
          A model may name a symbol or quote a short anchor from the code. It may not write code or
          line numbers into a lesson. The validator turns each reference into a file path, a line
          range and a blob SHA at the pinned commit, then inserts the excerpt from that commit
          itself.
        </p>
        <p>
          Each reference stores its path, line range and blob SHA, so you can check the excerpt
          against the repository at that commit. A diagram node may carry up to three references.
        </p>
      </Section>

      <Section title="What is checked">
        <CheckList />
      </Section>

      <Section title="Observed and interpretation">
        <p>Every statement in a lesson is one of two kinds.</p>
        <ul className={bulletListClass}>
          <li>
            <strong className="font-semibold text-foreground">Observed.</strong> The checker tied
            the statement to at least one reference in the code. Its evidence appears as chips.
            Opening a chip shows the cited lines.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Interpretation.</strong> The statement
            is the model’s reading, and the code does not confirm it. It is labelled “Interpretation
            — not confirmed by the code” and styled differently.
          </li>
        </ul>
        <p>
          When the model is unsure, it can list an open question instead of guessing. Open questions
          are shown to you as questions.
        </p>
      </Section>

      <Section title="Diagram validation">
        <p>
          A diagram is a typed specification: nodes, edges, labels and references. The system lays
          it out; a model never supplies the drawing. Every node must be a graph node, and every
          edge must join kept nodes. A diagram that fails is dropped rather than shown with a broken
          part.
        </p>
        <p>
          Architecture, tree, class and ERD come from the graph. On the full path, sequence,
          workflow, dataflow and lifecycle are authored by the planner and then put through the same
          checks.
        </p>
      </Section>

      <Section title="When a check fails">
        <ol className={numberedListClass}>
          <li>The failing reference is dropped and flagged.</li>
          <li>The lesson gets one repair attempt. The repair is bounded.</li>
          <li>Anything still failing is downgraded to interpretation, or removed.</li>
        </ol>
        <p>The course keeps a validation report that counts what was dropped and downgraded.</p>
      </Section>

      <Section title="Draft courses">
        <p>
          Each course gets a coverage score: the share of observed claims that kept their evidence
          after the checks. If the score is below the threshold, or a lesson has no content left,
          the course is published as a Draft and shows a banner: “Draft — lower confidence. Some
          claims could not be fully verified.”
        </p>
        <p>
          The score is deterministic. It counts the claims that kept their evidence; no model grades
          its own output.
        </p>
      </Section>

      <Section title="What the checks do not prove">
        <ul className={bulletListClass}>
          <li>
            They show that each reference points at code that exists at that commit, and that quoted
            text appears there. They do not show that an explanation is complete or correct.
          </li>
          <li>
            The analysis is static. Some links, such as calls that pass through re-exports, are not
            resolved. They are reported as unverified, not as missing.
          </li>
          <li>Replo does not run the code to test a claim. Release 1 executes nothing.</li>
          <li>Interpretation is the model’s opinion about the code. Read it as an opinion.</li>
        </ul>
      </Section>

      <NextLinks links={[HOW_IT_WORKS_PAGE, KEYS_AND_PRIVACY_PAGE, DOCS_INDEX]} />
    </Article>
  )
}
