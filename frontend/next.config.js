const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  output: 'export',
  // `next dev` gets its own folder so running `next build` (e.g. build:android)
  // doesn't overwrite the files a running dev server depends on.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
    ],
  },
})

module.exports = nextConfig
