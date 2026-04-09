/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output is required to reproduce the leak
  output: 'standalone',
}

module.exports = nextConfig
