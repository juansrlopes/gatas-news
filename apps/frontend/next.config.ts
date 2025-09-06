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
    domains: [
      'images.unsplash.com',
      'cdn.cnn.com',
      'media.cnn.com',
      'static01.nyt.com',
      'www.bbc.com',
      'ichef.bbci.co.uk',
      'cdn.vox-cdn.com',
      'www.reuters.com',
      'img.estadao.com.br',
      'conteudo.imguol.com.br',
      'uploads.metropoles.com',
      'www.cnnbrasil.com.br',
      'cdn-images-1.medium.com',
      'miro.medium.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
