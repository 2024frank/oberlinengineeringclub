import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {},
  webpack(config, { dev }) {
    // Keep local iteration usable on storage-constrained machines.
    if (dev) config.cache = false
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
    // AVIF first: noticeably smaller than WebP for these photographic backgrounds.
    formats: ['image/avif', 'image/webp'],
    // Sources are stored at <=1600px, so the default 2048/3840 buckets would only
    // upscale. Fewer buckets also means each one is far more likely to be a cache hit
    // rather than an on-demand optimization.
    deviceSizes: [640, 828, 1080, 1440, 1920],
    imageSizes: [96, 256, 420],
    // Hero/cover components request quality 72; without it in the allowed list
    // Next falls back and re-encodes at 75, defeating the shared cache.
    qualities: [72, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30
  }
}

export default nextConfig
