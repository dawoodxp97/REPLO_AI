import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
import { parseThemeCookie, THEME_COOKIE } from '@/features/session/theme-cookie'
import { Providers } from './providers'
import './globals.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: { default: 'Replo', template: '%s · Replo' },
  description: 'Grounded, chaptered tutorials for any GitHub repository.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection()
  const theme = parseThemeCookie((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
