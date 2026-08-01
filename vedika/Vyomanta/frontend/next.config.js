/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply COOP/COEP to all routes so SharedArrayBuffer is available
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.FRAPPE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/method/:path*',
        destination: `${backendUrl}/api/method/:path*`,
      },
      {
        source: '/api/resource/:path*',
        destination: `${backendUrl}/api/resource/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
