import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Enable transpilation of shared libraries in monorepo
  transpilePackages: ['@gatas-news/shared-utils', '@gatas-news/shared-types'],

  // Configure webpack to handle path aliases
  webpack: (config, { isServer }) => {
    // Configure path aliases for webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').join(__dirname, 'src'),
    };

    return config;
  },

  images: {
    domains: ['images.unsplash.com', 'example.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
