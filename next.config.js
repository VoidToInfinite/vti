// @ts-check

/** @type {import('next').NextConfig} */

const nextConfig = {
  compiler: {
      styledComponents: true,
  },
  compress: true,
  distDir: 'build',
  eslint: {
    dirs: ['pages', 'src'],
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  reactStrictMode: true,
  swcMinify: false,
  // Enabled: With this option set, urls like /about will redirect to /about/
  trailingSlash: false,
  transpilePackages: ["gsap","three"],
};

// @ts-ignore
module.exports = nextConfig;
