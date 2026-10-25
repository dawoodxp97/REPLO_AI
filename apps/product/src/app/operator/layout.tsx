import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverApi } from '@/lib/server-client'

export default async function OperatorLayout({ children }: { children: ReactNode }) {
  const api = await serverApi()
  const allowed = await api.operator.jobs({ limit: 1 }).then(
    () => true,
    () => false,
  )
  if (!allowed) notFound()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-4 py-2 sm:px-6">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight">
          Replo · operator
        </Link>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
