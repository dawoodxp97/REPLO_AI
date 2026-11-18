import type { Metadata } from 'next'
import Link from 'next/link'
import { Article, bulletListClass, DraftNotice, NextLinks, Section } from '@/components/article'
import { GROUNDING_PAGE, LICENCE_PAGE, PRIVACY_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The rules for using Replo: your key, the repositories you add, generated content and private courses.',
}

export default function TermsPage() {
  return (
    <Article
      title="Terms of use"
      notice={<DraftNotice />}
      lede="The rules for using Replo. Replo is free to use and is built for individual developers."
    >
      <Section title="The service">
        <p>
          Replo turns a public or private GitHub repository that you can access into a graph, typed
          diagrams and a chaptered course. Each course runs on your own provider key. Replo does not
          charge for runs and shows no ads. You pay your provider directly for the models a run
          uses. A course belongs to the account that generated it.
        </p>
      </Section>

      <Section title="Your key">
        <ul className={bulletListClass}>
          <li>
            Keep your provider key secure. You are responsible for your provider’s charges and for
            following the provider’s terms.
          </li>
          <li>Replo sends your key only to the provider you chose.</li>
          <li>A run uses the key you chose before it started, and no other key.</li>
        </ul>
      </Section>

      <Section title="Repositories you add">
        <ul className={bulletListClass}>
          <li>
            Add only repositories you have the right to read. For a private repository, that means
            you can access it on GitHub and the GitHub App has access to it.
          </li>
          <li>Replo reads repositories with read-only access and never runs their code.</li>
          <li>
            A run is pinned to one commit. Replo does not track changes or subscribe to webhooks. A
            repository change reaches Replo only when you start a rerun.
          </li>
        </ul>
      </Section>

      <Section title="Generated content">
        <p>
          Courses are written by models and checked by software. The checks reduce errors but do not
          remove them, so a course can still be wrong or incomplete. Read the observed and
          interpretation labels, and treat a Draft with care. Do not rely on a course as a security
          review, a licence opinion or professional advice. See{' '}
          <Link href={GROUNDING_PAGE.href} className="link-inline">
            how grounding is checked
          </Link>
          .
        </p>
      </Section>

      <Section title="Acceptable use">
        <ul className={bulletListClass}>
          <li>Do not use Replo to reach repositories or data you are not allowed to access.</li>
          <li>Do not try to get around rate limits, bot checks or access controls.</li>
          <li>Do not attack the service or overload it.</li>
          <li>
            Do not use generated material in a way that breaks the rights or confidentiality of the
            repository or its authors.
          </li>
        </ul>
      </Section>

      <Section title="Warranties and liability">
        <p>
          To the extent the law allows, Replo is provided as it is, without warranties of any kind.
          Replo is not liable for losses from generated content or from your provider’s charges.
        </p>
      </Section>

      <Section title="Ending your use">
        <p>
          You can stop using Replo at any time and delete your account. Replo may suspend an account
          that breaks these rules.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may change these terms, and we will update this page when we do.</p>
      </Section>

      <NextLinks links={[PRIVACY_PAGE, LICENCE_PAGE, GROUNDING_PAGE]} />
    </Article>
  )
}
