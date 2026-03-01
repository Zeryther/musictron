import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages that ship raw TypeScript
  transpilePackages: ['@musictron/app', '@musictron/ui'],
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      // The shared @musictron/app package uses `@/*` path aliases internally.
      '@': path.resolve(__dirname, '../../packages/app/src'),
      // The web app's own files use `@web/*`.
      '@web': path.resolve(__dirname, '.'),
    }
    return config
  },
}

export default nextConfig
