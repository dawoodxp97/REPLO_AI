import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
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
  description: 'Grounded, chaptered tutorials for any TypeScript/JavaScript repository.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection()
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
