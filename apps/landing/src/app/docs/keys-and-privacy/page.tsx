import type { Metadata } from 'next'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@replo/ui'
import { Article, bulletListClass, NextLinks, Section } from '@/components/article'
import { DOCS_INDEX, GROUNDING_PAGE, KEY_GUIDE, PRIVACY_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Keys and privacy',
  description:
    'What Replo stores, what it never stores or logs, how long it keeps things, and what GitHub access it asks for.',
}

const RETENTION = [
  {
    item: 'Repository archive',
    kept: 'Not kept. It is streamed for the run and removed with the snapshot.',
  },
  {
    item: 'Text of readable repository files',
    kept: 'While a job or course version references the snapshot. An unreferenced snapshot is deleted after one day.',
  },
  {
    item: 'Run checkpoints (intermediate model outputs)',
    kept: 'Deleted when the course is published. Leftovers are deleted after one day for succeeded runs and after 30 days for failed or canceled runs, so a retry can resume.',
  },
  {
    item: 'Run events',
    kept: '90 days. The job record itself stays with the repository until you remove it.',
  },
  {
    item: 'Notifications',
    kept: '90 days.',
  },
  {
    item: 'Courses, lesson progress, quiz attempts, keys and preferences',
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
            in the database or its backups.
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
          <li>Your name, email address, avatar and sign-in provider, and your session.</li>
          <li>
            The repositories you link, and the runs on them: status, stage, errors, model and
            pipeline.
          </li>
          <li>Your provider keys (encrypted), model choices and preferences.</li>
          <li>The courses you generate, your lesson progress and your quiz answers.</li>
          <li>Notifications about your runs.</li>
          <li>The text of readable repository files, kept as described below.</li>
        </ul>
      </Section>

      <Section title="What Replo never stores or logs">
        <ul className={bulletListClass}>
          <li>Your provider key in plain text, in a URL, in logs, or in error reports.</li>
          <li>Repository archives. They are streamed and removed with the snapshot.</li>
          <li>
            Prompts and model answers for a private repository. Replo keeps run metadata such as
            status, stage, model and timings, not the text.
          </li>
          <li>
            Source code or private prompts in logs. Logs hold request IDs, status codes and counts.
          </li>
          <li>Payment details. Replo has no paid plans, so it holds none.</li>
        </ul>
      </Section>

      <Section title="How long things are kept">
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableCaption className="sr-only">How long each kind of data is kept</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="px-4">
                  What
                </TableHead>
                <TableHead scope="col" className="px-4">
                  How long
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RETENTION.map((row) => (
                <TableRow key={row.item}>
                  <TableHead
                    scope="row"
                    className="h-auto px-4 py-3 align-top whitespace-normal text-foreground"
                  >
                    {row.item}
                  </TableHead>
                  <TableCell className="px-4 py-3 align-top text-muted-foreground">
                    {row.kept}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <li>
            Replo does not subscribe to webhooks and does not track commits. It reads the snapshot
            when you start a run.
          </li>
        </ul>
      </Section>

      <Section title="Repositories are never installed or run">
        <p>
          Replo does not install dependencies, build, test or run a repository’s code. It does not
          run examples written in a lesson either. Repository text is read as data. Instructions
          inside a repository, such as a README or a comment, are not followed.
        </p>
      </Section>

      <Section title="Deleting your data">
        <ul className={bulletListClass}>
          <li>Deleting a key takes effect at once.</li>
          <li>
            Removing a repository from your library deletes its courses, progress and links for your
            account.
          </li>
          <li>Deleting a course removes its versions, progress and quiz attempts.</li>
          <li>
            Deleting your account removes your keys, repository links, generations, courses,
            progress, quiz attempts, notifications and settings. Snapshots that no remaining run or
            version references are removed by the retention job.
          </li>
        </ul>
      </Section>

      <NextLinks links={[KEY_GUIDE, GROUNDING_PAGE, PRIVACY_PAGE, DOCS_INDEX]} />
    </Article>
  )
}
