import type {NextConfig} from 'next'

const isElectron = process.env.NEXT_PUBLIC_ELECTRON === 'true'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    distDir: isElectron ? 'out' : '.next',
    output: isElectron ? 'export' : 'standalone',
    assetPrefix: isElectron ? '.' : undefined,
    images: {
        unoptimized: isElectron,
    },
    experimental: {
        serverComponentsHmrCache: false,
    },
}

export default nextConfig
