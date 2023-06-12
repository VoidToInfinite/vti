// @ts-check

/** @type {import('next').NextConfig} */
const withTM = require("next-transpile-modules")(["gsap"]);

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
  trailingSlash: false
};

// @ts-ignore
module.exports = withTM(nextConfig);
