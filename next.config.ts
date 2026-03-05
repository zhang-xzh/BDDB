import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  output: 'standalone',
  experimental: {
    serverComponentsHmrCache: false,
  },
}

export default nextConfig
