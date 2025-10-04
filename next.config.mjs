// next.config.js - Configure API proxy
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for faster navigation
  experimental: {
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react', 'framer-motion'],
  },

  async rewrites() {
    // Only proxy API routes in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    }
    return [];
  },

  // Configure headers for file uploads
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;