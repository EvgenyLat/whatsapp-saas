/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000',
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },

  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'], // Modern formats first
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year for immutable images
    dangerouslyAllowSVG: false, // Security: disable SVG
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ============================================================================
  // HEADERS & CACHING
  // ============================================================================
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache JS and CSS with hash
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Security headers
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },

  // Production browser source maps disabled for security and performance
  productionBrowserSourceMaps: false,

  // ============================================================================
  // COMPRESSION
  // ============================================================================
  compress: true, // Enable gzip compression

  // ============================================================================
  // WEBPACK OPTIMIZATION
  // ============================================================================
  webpack: (config, { dev }) => {
    // Only add bundle analyzer if explicitly requested
    if (!dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    // Let Next.js handle code splitting with its optimized defaults
    return config;
  },


  // ============================================================================
  // REDIRECTS & REWRITES
  // ============================================================================
  async redirects() {
    return [];
  },

  // ============================================================================
  // COMPILER OPTIONS
  // ============================================================================
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,

    // Styled-components (if using)
    styledComponents: false,

    // React optimization
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-test'],
    } : false,
  },

  // ============================================================================
  // OUTPUT CONFIGURATION
  // ============================================================================
  output: 'standalone', // Docker-friendly output

  // ============================================================================
  // POWERING UP PERFORMANCE
  // ============================================================================
  poweredByHeader: false, // Remove X-Powered-By header for security
  generateEtags: true, // Generate ETags for caching

  // ============================================================================
  // EXPERIMENTAL FEATURES
  // ============================================================================
  experimental: {
    // Use Next.js built-in package optimization for lucide-react
    // This provides automatic tree-shaking without configuration conflicts
    optimizePackageImports: ['lucide-react', '@tanstack/react-query', 'date-fns'],
  },

  // Turbo configuration
  transpilePackages: [], // Add packages that need transpiling
};

module.exports = nextConfig;
