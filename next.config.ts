import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 启用严格模式
  reactStrictMode: true,

  // 输出目录
  distDir: '.next',

  // 静态页面生成
  output: 'standalone',

  // 环境变量
  env: {
    QB_HOST: process.env.QB_HOST || 'localhost:18000',
    QB_USER: process.env.QB_USER || '',
    QB_PASS: process.env.QB_PASS || '',
  },

  // 禁用 Edge Runtime 用于 API routes
  experimental: {
    serverComponentsHmrCache: false,
  },
}

export default nextConfig
