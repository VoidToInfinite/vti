import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  compiler: { styledComponents: true },
  reactStrictMode: true,
  trailingSlash: false,
}

export default nextConfig
