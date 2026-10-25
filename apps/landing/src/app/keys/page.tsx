import type { Metadata } from 'next'
import { Article, bulletListClass, linkClass, NextLinks, Section } from '@/components/article'
import { DOCS_PAGES, POLICY_PAGES } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Your key',
  description:
    'Which provider to use, how OpenRouter’s :free model limits apply to your account, and how Replo handles your key.',
}

export default function KeysPage() {
  return (
    <Article
      title="Bring your own key"
      lede="Every tutorial runs on a provider key that you add. Replo does not supply one. Pick a provider below. OpenRouter is the one we recommend."
    >
      <Section title="Choose a provider">
        <ul className={bulletListClass}>
          <li>
            <a href="https://openrouter.ai" className={linkClass}>
              OpenRouter
            </a>
            , recommended. One key reaches many models, including{' '}
            <code className="font-mono">:free</code> models. The free preset needs an OpenRouter key
            and uses only <code className="font-mono">:free</code> models.
          </li>
          <li>
            <a href="https://platform.openai.com" className={linkClass}>
              OpenAI
            </a>
            . Supported. Works with an OpenAI API key.
          </li>
          <li>
            <a href="https://aistudio.google.com" className={linkClass}>
              Google AI Studio
            </a>
            . Supported. Works with a Google AI Studio key.
          </li>
          <li>
            <a href="https://console.anthropic.com" className={linkClass}>
              Anthropic
            </a>
            . Supported. Works with an Anthropic API key.
          </li>
        </ul>
        <p>
          Each run uses one key and one model preset, both chosen before it starts. If the key
          fails, the run fails. Replo never switches to another key or another provider.
        </p>
      </Section>

      <Section title="OpenRouter’s :free limits">
        <p>
          The <code className="font-mono">:free</code> models are limited per OpenRouter account,
          not per Replo account. A run counts against the OpenRouter account of the key it uses.
          Limits at the time of writing (25 October 2026):
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
            in the database.
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
            error <code className="font-mono">KEY_REMOVED</code>. Nothing retries on another key.
          </li>
        </ul>
      </Section>

      <Section title="What your provider receives">
        <p>
          A run sends the code excerpts that each step needs to the provider you chose, under that
          provider’s terms. Replo never runs your repository’s code. Before you run a private
          repository, read the provider’s data-use terms.
        </p>
      </Section>

      <Section title="Cost">
        <p>
          Replo does not charge for runs and does not bill you. Before a run starts you see the
          model, the estimated requests and tokens, and a budget ceiling. The default ceiling is $2.
          The ceiling is a hard limit: a run stops before it would go past it.
        </p>
        <p>
          Your provider bills you for what the run uses. Replo records the token counts and cost
          reported by each provider response, so you can compare them with your bill.
        </p>
      </Section>

      <Section title="Delete a key">
        <p>
          You can delete a key at any time from your Replo settings. The deletion is immediate. Any
          run still using that key is marked failed with{' '}
          <code className="font-mono">KEY_REMOVED</code>.
        </p>
      </Section>

      <NextLinks links={[DOCS_PAGES[2], POLICY_PAGES[0]]} />
    </Article>
  )
}
