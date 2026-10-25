import type { Metadata } from 'next'
import { Article, bulletListClass, NextLinks, Section, tableCellClass } from '@/components/article'
import { DOCS_INDEX, KEY_GUIDE, POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Keys and privacy',
  description:
    'What Replo stores, what it never stores or logs, how long it keeps things, and what GitHub access it asks for.',
}

const RETENTION = [
  {
    item: 'Repository archive',
    kept: 'Not kept. It is streamed, not saved as a file.',
  },
  {
    item: 'Text of readable repository files',
    kept: 'While a tutorial or share link built from that snapshot exists. Snapshots that nothing references are deleted after one day.',
  },
  {
    item: 'Run checkpoints (intermediate model outputs)',
    kept: 'Cleared when the tutorial is published. Leftovers are deleted after one day for succeeded runs and after 30 days for failed or canceled runs, so a failed run can be retried.',
  },
  {
    item: 'Run events and per-call records',
    kept: '90 days.',
  },
  {
    item: 'Notifications and repository push records',
    kept: '90 days.',
  },
  {
    item: 'Tutorials, lesson progress, quiz answers, keys and settings',
    kept: 'Until you delete them.',
  },
]

export default function KeysAndPrivacyPage() {
  return (
    <Article
      title="Keys and privacy"
      lede="What Replo stores, what it never stores or logs, how long it keeps things, and what GitHub access it asks for. The privacy policy has the legal wording."
    >
      <Section title="Your key">
        <ul className={bulletListClass}>
          <li>Checked with one model-list call before it is stored. That call uses no tokens.</li>
          <li>
            Encrypted with AES-256-GCM. The encryption key lives in the server’s secret store, not
            in the database or the backups.
          </li>
          <li>Shown only as its last four characters.</li>
          <li>Decrypted in the worker’s memory for one run, and used only for your own runs.</li>
          <li>Sent only to the provider’s own API, at a fixed address.</li>
          <li>
            Deleted at once when you delete it. A run still using it is marked failed with{' '}
            <code className="font-mono">KEY_REMOVED</code>.
          </li>
        </ul>
      </Section>

      <Section title="What Replo stores">
        <ul className={bulletListClass}>
          <li>Your GitHub name and avatar, and your sign-in session.</li>
          <li>
            The repositories you link, and the runs on them: status, stage, errors, budget and
            spend.
          </li>
          <li>Your provider keys (encrypted), model choices and preferences.</li>
          <li>The tutorials you generate, your lesson progress and your quiz answers.</li>
          <li>Notifications about your runs.</li>
          <li>For each model call: the provider, the model, token counts, cost and latency.</li>
          <li>The text of readable repository files, kept as described below.</li>
        </ul>
      </Section>

      <Section title="What Replo never stores or logs">
        <ul className={bulletListClass}>
          <li>Your provider key in plain text, in a URL, in logs, or in error reports.</li>
          <li>Repository archives. They are streamed and not saved.</li>
          <li>
            Prompts and model answers in the per-call records. Those records hold token counts, cost
            and latency only.
          </li>
          <li>
            Source code or private prompts in logs. Logs hold request IDs, status codes and counts.
          </li>
          <li>Payment details. Replo has no paid plans, so it holds none.</li>
        </ul>
      </Section>

      <Section title="How long things are kept">
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">How long each kind of data is kept</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  How long
                </th>
              </tr>
            </thead>
            <tbody>
              {RETENTION.map((row) => (
                <tr key={row.item}>
                  <th scope="row" className={`${tableCellClass} font-medium`}>
                    {row.item}
                  </th>
                  <td className={tableCellClass}>{row.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="GitHub access">
        <ul className={bulletListClass}>
          <li>
            The GitHub App asks for read-only access to Contents and Metadata, and only for the
            repositories you select.
          </li>
          <li>
            Each run gets a short-lived installation token, scoped to one repository. It is kept in
            memory and is not written to logs.
          </li>
        </ul>
      </Section>

      <Section title="Repositories are never installed or run">
        <p>
          Replo does not install dependencies, build, test or run a repository’s code. It does not
          run the examples the model writes either. Repository text is read as data. Instructions
          inside a repository, such as a README or a comment, are not followed.
        </p>
      </Section>

      <Section title="Deleting your data">
        <ul className={bulletListClass}>
          <li>Deleting a key takes effect at once.</li>
          <li>
            Removing a repository from your library deletes your tutorials, progress and links for
            it, public ones included.
          </li>
          <li>
            Deleting a tutorial removes its versions, progress and quiz attempts. Its public and
            share links stop working.
          </li>
          <li>
            Deleting your account removes your keys, progress, private tutorials and private files.
            For your public tutorials, you choose whether to delete them or keep them anonymised.
          </li>
        </ul>
      </Section>

      <NextLinks links={[KEY_GUIDE, POLICY_PAGES[0], DOCS_INDEX]} />
    </Article>
  )
}
