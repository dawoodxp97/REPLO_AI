import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'
import { Footer, Header } from '@/components/site'
import './globals.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:7100'

const SITE_TITLE = 'Replo — a graph and a course for any GitHub repository'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: SITE_TITLE, template: '%s · Replo' },
  description:
    'Replo reads a GitHub repository into a layer-grouped graph, typed diagrams and a chaptered course whose observed claims point at the commit-pinned code. Free, on your own model key.',
  openGraph: {
    type: 'website',
    siteName: 'Replo',
    title: SITE_TITLE,
    description: 'A graph, typed diagrams and a checked course for any GitHub repository.',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
