import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Self-contained server build for Docker/k8s (.next/standalone).
  output: 'standalone',
  // Dashboard is served under /app in the cluster ingress (storefront owns /).
  // Set NEXT_PUBLIC_BASE_PATH='' at build time to serve at root (e.g. on Vercel).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/app',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
