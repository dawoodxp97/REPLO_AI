'use client'

import { Button } from '@replo/ui'
import { signInWithGithub } from '@/lib/auth-client'

export function SignInButton() {
  return (
    <Button size="lg" onClick={() => void signInWithGithub()}>
      Continue with GitHub
    </Button>
  )
}
