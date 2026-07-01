import { execSync } from 'child_process';
import path from 'path';
import type { NextConfig } from 'next';

function getGitHash(): string {
  if (process.env.NEXT_PUBLIC_GIT_HASH) return process.env.NEXT_PUBLIC_GIT_HASH;
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_HASH: getGitHash(),
  },
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
