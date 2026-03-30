const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['recharts', 'react-day-picker'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['react'] = path.resolve('./node_modules/react')
      config.resolve.alias['react-dom'] = path.resolve('./node_modules/react-dom')
    }
    return config
  },
}

module.exports = nextConfig
