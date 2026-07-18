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
      {
        // Placeholder hero images the API serves for news items without a real
        // image yet (e.g. seed/fallback data).
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // RAWG cover art + screenshots used to illustrate game-linked content
        // (walkthroughs, guide game cards).
        protocol: "https",
        hostname: "media.rawg.io",
      },
    ],
  },
  // Force the old landing.nexzyapp.com subdomain to 301-redirect to the
  // canonical www domain (Netlify auto-redirects the apex, but not plain
  // subdomain aliases — this avoids duplicate-content on two live URLs).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "landing.nexzyapp.com" }],
        destination: "https://www.nexzyapp.com/:path*",
        permanent: true,
      },
    ];
  },
  // Serve the app-link verification files at the exact well-known paths Apple
  // and Google require (internal rewrites, NOT redirects). See app/aasa and
  // app/android-assetlinks.
  async rewrites() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/aasa",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/android-assetlinks",
      },
    ];
  },
};

export default nextConfig;
