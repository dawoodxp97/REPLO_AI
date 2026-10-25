import type { Metadata } from 'next'
import { Article, bulletListClass, DraftNotice, NextLinks, Section } from '@/components/article'
import { DOCS_INDEX, POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Reports and takedown',
  description:
    'How to report a public tutorial, what happens next, and the grounds for removing one.',
}

export default function TakedownPage() {
  return (
    <Article
      title="Reports and takedown"
      notice={<DraftNotice />}
      lede="How to report a public tutorial, what happens next, and when a tutorial is removed."
    >
      <Section title="How to report">
        <p>
          Use the report form on the public tutorial. Say what is wrong and where: the lesson, the
          claim, or the file. Include a link or a line reference if you can. If you own the
          repository, say so.
        </p>
      </Section>

      <Section title="What happens next">
        <p>
          A person reads each report. Replo does not remove tutorials automatically. In this
          release, takedown decisions are made by hand.
        </p>
        <p>
          If a report is upheld, Replo may remove or change the tutorial. Removing a tutorial does
          not change the repository or its code.
        </p>
      </Section>

      <Section title="Grounds for action">
        <ul className={bulletListClass}>
          <li>
            The repository has no OSI-approved licence, or its licence has changed to one that is
            not approved.
          </li>
          <li>The tutorial shows a secret, such as a key or a token, or personal data.</li>
          <li>
            The tutorial copies material beyond short quotations, and the rights holder has not
            allowed it.
          </li>
          <li>The tutorial is unlawful, defamatory or abusive.</li>
          <li>The owner of the repository asks for its public tutorials to be removed.</li>
        </ul>
      </Section>

      <Section title="If a tutorial shows a secret">
        <p>
          Report it straight away. Removing the tutorial does not make the secret safe, so rotate or
          revoke the secret with its provider as well.
        </p>
      </Section>

      <NextLinks links={[POLICY_PAGES[0], POLICY_PAGES[2], DOCS_INDEX]} />
    </Article>
  )
}
