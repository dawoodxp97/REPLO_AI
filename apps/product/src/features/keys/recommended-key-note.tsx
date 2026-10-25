import { OPENROUTER_KEYS_URL, PROVIDER_LABELS, RECOMMENDED_PROVIDER } from './providers'

export function RecommendedKeyNote() {
  return (
    <p className="text-sm text-muted-foreground">
      Replo runs every tutorial on a key you own, so the bill is your provider’s. We recommend{' '}
      {PROVIDER_LABELS[RECOMMENDED_PROVIDER]}: one key reaches many models, including free ones.{' '}
      <a
        href={OPENROUTER_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4"
      >
        Get an OpenRouter key
      </a>
    </p>
  )
}
