import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname:
          '/images/branding/googleg/1x/googleg_standard_color_128dp.png',
      },
    ],
  },
};

export default nextConfig;
