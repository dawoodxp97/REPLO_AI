import type { Metadata } from 'next'
import {
  Article,
  bulletListClass,
  numberedListClass,
  NextLinks,
  Section,
} from '@/components/article'
import { DOCS_INDEX, DOCS_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'How grounding is checked',
  description:
    'How Replo ties each explanation to pinned code, what the checks test, what happens when one fails, and what they do not prove.',
}

export default function GroundingPage() {
  return (
    <Article
      title="How grounding is checked"
      lede="A tutorial is only useful if you can check it. Replo separates what the code shows from what the model thinks it means, and checks each reference the model makes."
    >
      <Section title="The model points, the system quotes">
        <p>
          A model may name a symbol or quote a short anchor from the code. It may not write code or
          line numbers into a tutorial. The validator turns each reference into a file path, a line
          range and a blob SHA at the pinned commit, then inserts the excerpt from that commit
          itself.
        </p>
        <p>
          Each reference stores its path, line range and blob SHA, so you can check the excerpt
          against the repository at that commit.
        </p>
      </Section>

      <Section title="What is checked">
        <ul className={bulletListClass}>
          <li>The file path exists in the pinned snapshot.</li>
          <li>The symbol exists, or the closest match in the same file does.</li>
          <li>
            A quoted anchor appears in the file, after whitespace is normalised. Quotes shorter than
            eight characters are not accepted as evidence.
          </li>
          <li>
            Identifiers in backticks match a symbol, a file or a dependency the repository declares.
            An identifier the repository does not contain drops the whole block.
          </li>
          <li>
            Each step in a flow diagram matches a link the index found between files. A step with no
            such link is dropped as an unverified hop.
          </li>
          <li>
            Diagrams must parse under a restricted grammar, and every node must map to a known file.
          </li>
          <li>
            Markdown is restricted. Raw HTML and unsafe links are stripped before anything is shown.
          </li>
        </ul>
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

      <Section title="When a check fails">
        <ol className={numberedListClass}>
          <li>The failing reference is dropped and flagged.</li>
          <li>
            The lesson gets one repair attempt. The repair is bounded, so the cost of a run stays
            predictable.
          </li>
          <li>Anything still failing is downgraded to interpretation, or removed.</li>
        </ol>
        <p>The tutorial keeps a validation report that counts what was dropped and downgraded.</p>
      </Section>

      <Section title="Draft tutorials">
        <p>
          Each tutorial gets a confidence score. It is the share of observed claims that kept their
          evidence after the checks, combined with a review score from a model judge where the
          pipeline uses one. If the score is below the threshold, or a lesson has no content left,
          the tutorial is published as a Draft and shows this banner:
        </p>
        <p
          role="note"
          className="rounded-md border-l-4 border-interpretation bg-interpretation/10 px-4 py-3 text-sm"
        >
          Draft — lower confidence. Some claims could not be fully verified.
        </p>
        <p>The threshold is provisional and is adjusted as evaluation results come in.</p>
      </Section>

      <Section title="What the checks do not prove">
        <ul className={bulletListClass}>
          <li>
            They show that each reference points at code that exists at that commit, and that any
            quoted text appears there. They do not show that an explanation is complete or correct.
          </li>
          <li>
            The analysis is static. Some links, such as calls that pass through re-exports, are not
            resolved. They are reported as unverified, not as missing.
          </li>
          <li>Replo does not run the code to test a claim. Release 1 executes nothing.</li>
          <li>Interpretation is the model’s opinion about the code. Read it as an opinion.</li>
        </ul>
      </Section>

      <NextLinks links={[DOCS_PAGES[0], DOCS_PAGES[2], DOCS_INDEX]} />
    </Article>
  )
}
