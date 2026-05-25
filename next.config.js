/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cargurus.com" },
      { protocol: "https", hostname: "**.autotrader.com" },
      { protocol: "https", hostname: "**.cars.com" },
      { protocol: "https", hostname: "**.craigslist.org" },
      { protocol: "https", hostname: "**.carmax.com" },
      { protocol: "https", hostname: "static.cargurus.com" },
      { protocol: "https", hostname: "images.autotrader.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["cheerio"],
  },
};

module.exports = nextConfig;
