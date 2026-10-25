import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Article,
  bulletListClass,
  DraftNotice,
  linkClass,
  NextLinks,
  Section,
} from '@/components/article'
import { DOCS_PAGES, KEY_GUIDE, POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Replo collects, who receives it, how long it is kept, and your choices.',
}

export default function PrivacyPage() {
  return (
    <Article
      title="Privacy policy"
      notice={<DraftNotice />}
      lede="What Replo collects, why, who receives it, and how long we keep it. Replo is a free tool for individual developers."
    >
      <Section title="What we collect">
        <ul className={bulletListClass}>
          <li>Your GitHub name and avatar, and a session that keeps you signed in.</li>
          <li>
            The repositories you link, and the runs you start on them: status, stage, errors, budget
            and spend.
          </li>
          <li>Your provider keys, encrypted. We show only their last four characters.</li>
          <li>Your model choices and preferences.</li>
          <li>The tutorials you generate, your lesson progress and your quiz answers.</li>
          <li>Notifications about your runs.</li>
          <li>
            For each model call: the provider, the model, token counts, cost and latency. Not the
            prompt or the answer.
          </li>
          <li>
            The text of readable files from the repository snapshot a tutorial uses, kept as
            described below.
          </li>
          <li>
            Request logs, which hold request IDs, status codes and counts. They never hold your
            keys, your source code, or model prompts and answers.
          </li>
        </ul>
      </Section>

      <Section title="What we do not do">
        <ul className={bulletListClass}>
          <li>We do not show advertising.</li>
          <li>We do not run analytics or tracking scripts on this website.</li>
          <li>We do not sell your data.</li>
          <li>We do not hold payment details. Replo has no paid plans.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>
          We use your data to run the tutorials you ask for, show your progress, keep you signed in,
          protect the service from abuse, and tell you about your runs.
        </p>
      </Section>

      <Section title="Who receives it">
        <ul className={bulletListClass}>
          <li>GitHub, for sign-in and for reading the repositories you allow.</li>
          <li>
            The model provider you choose, for each run. It receives the code excerpts and prompts
            that the run needs, under its own terms. The{' '}
            <Link href={KEY_GUIDE.href} className={linkClass}>
              key guide
            </Link>{' '}
            explains this.
          </li>
          <li>
            Hosting providers for the service. Replo will name them before launch. Encrypted
            database backups are planned for launch and will be stored with a hosting provider named
            here.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          The{' '}
          <Link href={DOCS_PAGES[2].href} className={linkClass}>
            keys and privacy
          </Link>{' '}
          guide lists each kind of data and how long it is kept. In short: repository archives are
          not kept; run events and model-call records are kept for 90 days; tutorials, progress and
          keys stay until you delete them.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className={bulletListClass}>
          <li>Delete a provider key at any time. It takes effect at once.</li>
          <li>Remove a repository from your library, or delete a tutorial.</li>
          <li>
            Delete your account. This removes your keys, progress, private tutorials and private
            files.
          </li>
          <li>
            For public tutorials, choose when you delete your account whether to delete them or keep
            them anonymised.
          </li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          This website sets no cookies. The Replo app uses one session cookie to keep you signed in.
          It is httpOnly, Secure and SameSite=Lax, and sign-in needs it.
        </p>
      </Section>

      <Section title="Questions and requests">
        <p>
          To contact us, including about your data, use the report form on any public tutorial in
          the app.
        </p>
      </Section>

      <Section title="Changes">
        <p>We will update this page when our practices change.</p>
      </Section>

      <NextLinks links={[POLICY_PAGES[1], POLICY_PAGES[2], POLICY_PAGES[3]]} />
    </Article>
  )
}
