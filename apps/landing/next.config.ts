import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  agentRules: false,
  reactStrictMode: true,
  transpilePackages: ['@replo/ui'],
}

export default nextConfig
