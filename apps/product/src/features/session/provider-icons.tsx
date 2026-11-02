import type { OAuthProvider } from '@replo/contracts'
import type { ComponentProps, ComponentType } from 'react'

function GithubIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function GoogleIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.64 4.1-5.35 4.1a5.9 5.9 0 0 1 0-11.8c1.87 0 3.12.8 3.84 1.48l2.35-2.27A9.1 9.1 0 0 0 12 3a9 9 0 1 0 0 18c5.19 0 8.63-3.65 8.63-8.8 0-.6-.07-1.04-.15-1.1Z" />
    </svg>
  )
}

const ICONS: Record<OAuthProvider, ComponentType<ComponentProps<'svg'>>> = {
  github: GithubIcon,
  google: GoogleIcon,
}

export function ProviderIcon({
  provider,
  ...props
}: ComponentProps<'svg'> & { provider: OAuthProvider }) {
  const Icon = ICONS[provider]
  return <Icon {...props} />
}
