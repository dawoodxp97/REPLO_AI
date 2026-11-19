import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Deployment under a path prefix (e.g. the Cloudflare gateway serves the app
  // at /app). Empty in local dev, so the app stays at http://localhost:7101/.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  poweredByHeader: false,
  agentRules: false,
  reactStrictMode: true,
  transpilePackages: ['@replo/ui', '@replo/contracts'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
