import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default nextConfig
