'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SignInInput, SignUpInput } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { orpc } from '@/lib/orpc'
import { AuthForm } from './auth-form'
import { describeAuthError } from './auth-notices'
import { TextField } from './text-field'

function useEnterApp() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return () => {
    queryClient.clear()
    router.replace('/')
  }
}

export function SignInForm() {
  const enterApp = useEnterApp()
  const signIn = useMutation(orpc.auth.signIn.mutationOptions({ onSuccess: enterApp }))
  const form = useForm({
    resolver: zodResolver(SignInInput),
    defaultValues: { email: '', password: '' },
  })
  const errors = form.formState.errors

  return (
    <AuthForm
      onSubmit={form.handleSubmit((input) => signIn.mutate(input))}
      error={signIn.isError ? describeAuthError(signIn.error) : null}
      pending={signIn.isPending}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
    >
      <TextField
        id="sign-in-email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email ? 'Enter a valid email address.' : undefined}
        {...form.register('email')}
      />
      <TextField
        id="sign-in-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password ? 'Enter your password.' : undefined}
        {...form.register('password')}
      />
    </AuthForm>
  )
}

export function SignUpForm() {
  const enterApp = useEnterApp()
  const signUp = useMutation(orpc.auth.signUp.mutationOptions({ onSuccess: enterApp }))
  const form = useForm({
    resolver: zodResolver(SignUpInput),
    defaultValues: { name: '', email: '', password: '' },
  })
  const errors = form.formState.errors

  return (
    <AuthForm
      onSubmit={form.handleSubmit((input) => signUp.mutate(input))}
      error={signUp.isError ? describeAuthError(signUp.error) : null}
      pending={signUp.isPending}
      submitLabel="Create account"
      pendingLabel="Creating account…"
    >
      <TextField
        id="sign-up-name"
        label="Name"
        autoComplete="name"
        error={errors.name ? 'Enter your name.' : undefined}
        {...form.register('name')}
      />
      <TextField
        id="sign-up-email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email ? 'Enter a valid email address.' : undefined}
        {...form.register('email')}
      />
      <TextField
        id="sign-up-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password ? 'Use 8 to 128 characters.' : undefined}
        {...form.register('password')}
      />
    </AuthForm>
  )
}
