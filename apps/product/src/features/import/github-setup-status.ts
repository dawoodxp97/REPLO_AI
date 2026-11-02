export type GithubSetupTone = 'observed' | 'interpretation' | 'destructive'

export interface GithubSetupMessage {
  tone: GithubSetupTone
  title: string
  description: string
}

const GITHUB_SETUP_MESSAGES: Readonly<Record<string, GithubSetupMessage>> = {
  linked: {
    tone: 'observed',
    title: 'GitHub App connected',
    description: 'Choose “My GitHub App repos” below to pick a repository it can read.',
  },
  not_accessible: {
    tone: 'interpretation',
    title: 'The installation could not be read',
    description:
      'GitHub did not let Replo read that installation. Install the app again and grant access to at least one repository.',
  },
  owned_by_another_user: {
    tone: 'destructive',
    title: 'That installation belongs to another account',
    description:
      'It is already linked to a different Replo user. Install the app on your own GitHub account instead.',
  },
  github_not_linked: {
    tone: 'interpretation',
    title: 'Sign in with GitHub first',
    description:
      'Replo could not confirm your GitHub identity. Sign out, sign in with GitHub, then install the app again.',
  },
  invalid: {
    tone: 'destructive',
    title: 'The GitHub setup link was not valid',
    description: 'Start the install again from “Install the GitHub App”.',
  },
  error: {
    tone: 'destructive',
    title: 'GitHub setup did not finish',
    description:
      'Something failed while connecting the GitHub App. Try the install again in a few minutes.',
  },
}

export function githubSetupMessage(status: string | undefined): GithubSetupMessage | null {
  if (status === undefined) return null
  return Object.hasOwn(GITHUB_SETUP_MESSAGES, status)
    ? (GITHUB_SETUP_MESSAGES[status] ?? null)
    : null
}
