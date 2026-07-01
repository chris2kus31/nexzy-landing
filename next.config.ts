import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    // Newsroom hero images live in the public S3 bucket; allow next/image to
    // optimize (resize + webp/avif) them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nexzy-newsroom-media.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
