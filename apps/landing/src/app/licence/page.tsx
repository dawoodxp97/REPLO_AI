import type { Metadata } from 'next'
import Link from 'next/link'
import { Article, bulletListClass, DraftNotice, NextLinks, Section } from '@/components/article'
import { GROUNDING_PAGE, PRIVACY_PAGE, TERMS_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Licence and attribution',
  description:
    'How Replo quotes source code, how attribution works, and why a quoted excerpt keeps its repository’s licence.',
}

export default function LicencePage() {
  return (
    <Article
      title="Licence and attribution"
      notice={<DraftNotice />}
      lede="A course quotes short excerpts from the repository it describes. The excerpt keeps the licence of its repository, and the course names the repository and the commit it read."
    >
      <Section title="Quoted code">
        <ul className={bulletListClass}>
          <li>Replo quotes short excerpts to support a lesson or a diagram edge.</li>
          <li>Quoted code keeps the licence of the repository it came from.</li>
          <li>Replo does not relicense the repository and claims no ownership of it.</li>
          <li>Every excerpt points at a file, a line range and a blob SHA at the pinned commit.</li>
        </ul>
      </Section>

      <Section title="Attribution">
        <ul className={bulletListClass}>
          <li>The course names the repository and the commit it read.</li>
          <li>The source panel links to the file on GitHub at that commit.</li>
          <li>
            The generated prose, diagrams and quizzes are not a copy of the repository. They
            describe the code that the references point at.
          </li>
        </ul>
      </Section>

      <Section title="Your repository">
        <p>
          Your repository stays yours. Replo reads a snapshot with read-only access and never runs
          or redistributes the repository. A course is private to the account that generated it.
        </p>
      </Section>

      <Section title="Problems with an excerpt">
        <p>
          This draft is reviewed before launch. It will name the operator and a contact address for
          reports about an excerpt or its attribution. The{' '}
          <Link href={PRIVACY_PAGE.href} className="link-inline">
            privacy policy
          </Link>{' '}
          will carry the same details.
        </p>
      </Section>

      <NextLinks links={[TERMS_PAGE, PRIVACY_PAGE, GROUNDING_PAGE]} />
    </Article>
  )
}
