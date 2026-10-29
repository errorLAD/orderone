/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // ─── Bundle optimisation ────────────────────────────────────────────────────
  experimental: {
    // Tree-shake icon/chart libraries so only imported symbols are bundled
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // ─── Image optimisation ─────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images on CDN for 7 days
    minimumCacheTTL: 604800,
    // Responsive device sizes to generate (avoids over-fetching on mobile)
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // ─── URL rewrites ───────────────────────────────────────────────────────────
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },

  // ─── HTTP headers ───────────────────────────────────────────────────────────
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      // Cache public uploads / category images for 24 hours
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Cache public images for 24 hours
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
