/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    const existing = config.ignoreWarnings || []
    config.ignoreWarnings = [
      ...existing,
      (warning) => {
        const msg = (warning && warning.message) || ''
        const resource = warning?.module?.resource || ''
        return (
          msg.includes('Critical dependency: the request of a dependency is an expression') &&
          /node_modules[\\\/]@supabase[\\\/]realtime-js[\\\/]/.test(resource)
        )
      },
    ]
    return config
  },
}

module.exports = nextConfig 