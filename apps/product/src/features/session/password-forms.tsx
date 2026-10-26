'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SignInInput, SignUpInput } from '@replo/contracts'
import { Alert, Button, FormField, Input } from '@replo/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { orpc } from '@/lib/orpc'
import { describeAuthError } from './auth-notices'

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
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((input) => signIn.mutate(input))}
    >
      <FormField
        id="sign-in-email"
        label="Email"
        error={errors.email ? 'Enter a valid email address.' : undefined}
      >
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          {...form.register('email')}
        />
      </FormField>
      <FormField
        id="sign-in-password"
        label="Password"
        error={errors.password ? 'Enter your password.' : undefined}
      >
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
      </FormField>
      {signIn.isError ? (
        <Alert tone="destructive" role="alert">
          {describeAuthError(signIn.error)}
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={signIn.isPending}>
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
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
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((input) => signUp.mutate(input))}
    >
      <FormField
        id="sign-up-name"
        label="Name"
        error={errors.name ? 'Enter your name.' : undefined}
      >
        <Input
          id="sign-up-name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          {...form.register('name')}
        />
      </FormField>
      <FormField
        id="sign-up-email"
        label="Email"
        error={errors.email ? 'Enter a valid email address.' : undefined}
      >
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          {...form.register('email')}
        />
      </FormField>
      <FormField
        id="sign-up-password"
        label="Password"
        hint="At least 8 characters."
        error={errors.password ? 'Use 8 to 128 characters.' : undefined}
      >
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
      </FormField>
      {signUp.isError ? (
        <Alert tone="destructive" role="alert">
          {describeAuthError(signUp.error)}
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
