import type { NextConfig } from "next"
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  serverExternalPackages: ['cloudinary'],
  // Allow larger exercise video uploads through App Router route handlers
  experimental: {
    serverActions: {
      bodySizeLimit: '55mb',
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '*.devtunnels.ms',
        '*.inc1.devtunnels.ms',
      ],
    },
  },
  // Prevent mobile browsers from caching stale dev bundles (old Server Action IDs)
  async headers() {
    if (process.env.NODE_ENV !== 'development') return []
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ]
  },
}

const pwaConfig = withPWA({
  dest: 'public',
  // Disabled: next-pwa requires webpack and conflicts with `next build --turbopack`.
  // Offline + rest notifications use public/sw.js via PwaRegister instead.
  disable: true,
})

export default pwaConfig(nextConfig)
