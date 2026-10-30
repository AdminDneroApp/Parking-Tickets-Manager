import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['warn', 'error'] }
        : false,
  },
  poweredByHeader: false,
  // Dev only: let phones on the LAN (http://192.168.x.x:3000) load dev resources.
  // Next 16 blocks them by default and the page never hydrates (no buttons work).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HSTS only in production builds: in dev it pins localhost to HTTPS in the browser
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera=(self): the form opens the phone camera or the desktop webcam
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
