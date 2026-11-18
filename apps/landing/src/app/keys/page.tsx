import type { Metadata } from 'next'
import { Article, bulletListClass, NextLinks, Section } from '@/components/article'
import { ProviderTable } from '@/components/provider-table'
import { FreeModelTag } from '@/lib/providers'
import { DOCS_INDEX, GROUNDING_PAGE, KEYS_AND_PRIVACY_PAGE, PRIVACY_PAGE } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Your key',
  description:
    'Which provider to use, how OpenRouter’s :free model limits apply to your account, and how Replo handles your key.',
}

export default function KeysPage() {
  return (
    <Article
      title="Bring your own key"
      lede="Every course runs on a provider key you add. Replo does not supply one and never switches to another key or provider. OpenRouter is the provider we recommend."
    >
      <Section title="Choose a provider">
        <ProviderTable />
        <p>
          One key and one model are chosen before a run. The model comes from your settings unless
          you change it at import. If the key fails, the run fails.
        </p>
      </Section>

      <Section title="OpenRouter’s :free limits">
        <p>
          The <FreeModelTag /> models are limited per OpenRouter account, not per Replo account. A
          run counts against the OpenRouter account of the key it uses. Limits as published in
          November 2026:
        </p>
        <ul className={bulletListClass}>
          <li>20 requests per minute.</li>
          <li>
            50 requests per day, or 1,000 per day after a one-time $10 purchase on OpenRouter.
          </li>
        </ul>
        <p>
          OpenRouter sets these limits and can change them, so check its current figures before a
          large run. A run that reaches a limit can fail. Replo does not retry it on another key.
        </p>
      </Section>

      <Section title="How your key is handled">
        <ul className={bulletListClass}>
          <li>
            <strong className="font-semibold text-foreground">Checked before it is stored.</strong>{' '}
            Replo makes one model-list call to the provider. That call uses no tokens. If the
            provider rejects the key, or the check cannot finish, nothing is stored.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Stored encrypted.</strong> Keys are
            encrypted with AES-256-GCM. The encryption key is held in the server’s secret store, not
            in the database or its backups.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Shown only by its last four characters.
            </strong>{' '}
            Replo does not display the full key again.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Used only for your own runs.</strong>{' '}
            A key is decrypted in the worker’s memory for one run. It is never written to logs or
            error reports.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Sent only to the provider.</strong>{' '}
            Requests go to the provider’s own API at a fixed address. You cannot enter another
            address.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Deletable at any time.</strong>{' '}
            Deleting a key takes effect at once. A run still using it is marked failed with the
            error <code className="font-mono text-inline-code">KEY_REMOVED</code>. Nothing retries
            on another key.
          </li>
        </ul>
      </Section>

      <Section title="What your provider receives">
        <p>
          A run sends the code excerpts that each stage needs to the provider you chose, under that
          provider’s terms. Replo never runs your repository’s code. Prompts and answers for a
          private repository are not stored; run metadata such as status, stage, model and timings
          is kept.
        </p>
      </Section>

      <Section title="Run limits and cost">
        <p>
          Replo charges nothing and bills no one. Your provider bills your account for the tokens a
          run uses.
        </p>
        <p>
          The server caps the total input and output tokens for one run. When the ceiling is
          reached, the run stops with the error{' '}
          <code className="font-mono text-inline-code">RUN_LIMIT_EXCEEDED</code>. Retrying a failed
          or canceled run reuses its completed stages and saved checkpoints, so finished work is not
          paid for twice.
        </p>
      </Section>

      <Section title="Delete a key">
        <p>
          You can delete a key at any time from your Replo settings. The deletion is immediate. Any
          run still using that key is marked failed with{' '}
          <code className="font-mono text-inline-code">KEY_REMOVED</code>.
        </p>
      </Section>

      <NextLinks links={[KEYS_AND_PRIVACY_PAGE, GROUNDING_PAGE, PRIVACY_PAGE, DOCS_INDEX]} />
    </Article>
  )
}
