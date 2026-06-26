import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
