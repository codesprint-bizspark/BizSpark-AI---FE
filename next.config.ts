import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Self-contained server build for Docker/k8s (.next/standalone).
  output: 'standalone',
  // Served at root on the apex host (bizspark.randitha.net). Set
  // NEXT_PUBLIC_BASE_PATH only if hosting under a sub-path.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
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
