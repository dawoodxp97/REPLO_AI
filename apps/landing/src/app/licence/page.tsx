import type { Metadata } from 'next'
import { Article, bulletListClass, DraftNotice, NextLinks, Section } from '@/components/article'
import { POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Licence and attribution',
  description:
    'Public tutorials are allowed only for repositories with an OSI-approved licence. What a public tutorial shows.',
}

export default function LicencePage() {
  return (
    <Article
      title="Licence and attribution"
      notice={<DraftNotice />}
      lede="Public tutorials are allowed only for repositories with an open-source licence approved by the Open Source Initiative (OSI)."
    >
      <Section title="Which repositories can be public">
        <p>
          Replo reads the licence that GitHub reports for the repository. If that licence is on
          Replo’s list of OSI-approved licences, the repository can have public tutorials.
        </p>
        <p>
          A repository with no licence, a licence GitHub cannot identify, or a licence that is not
          on the list cannot have public tutorials. Its tutorials cannot be made public.
        </p>
      </Section>

      <Section title="What a public tutorial shows">
        <ul className={bulletListClass}>
          <li>The licence of the source repository, by name.</li>
          <li>Attribution to the source repository, with a link to it.</li>
          <li>A link to the commit the tutorial is pinned to.</li>
          <li>Quoted code from the repository. Quoted code keeps the repository’s licence.</li>
        </ul>
      </Section>

      <Section title="The list of licences">
        <p>
          The list of approved licences is part of Replo’s code. A licence is added to it only
          through a reviewed change.
        </p>
      </Section>

      <Section title="Problems with a licence">
        <p>
          Report a tutorial whose licence information is wrong, or whose repository has changed its
          licence, through the report form on the tutorial. See Reports and takedown.
        </p>
      </Section>

      <NextLinks links={[POLICY_PAGES[3], POLICY_PAGES[0], POLICY_PAGES[1]]} />
    </Article>
  )
}
