import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    // Serve AVIF first (smaller + sharper), webp as the fallback. Next 16
    // defaults to webp-ONLY (image-config.js: formats: ['image/webp']), so
    // without this our AVIF masters were re-encoded down to webp for every
    // browser. Order matters: the first supported format wins.
    formats: ["image/avif", "image/webp"],
    // Next 16 requires every `quality` used on <Image> to be allow-listed here
    // (default is [75]). 90 lets hero images render near-lossless on retina.
    qualities: [75, 90],
    // Newsroom hero images live in the public S3 bucket; allow next/image to
    // optimize (resize + webp/avif) them.
    remotePatterns: [
      {
        // CloudFront CDN in front of the media bucket (CDN_BASE_URL). Newsroom
        // images now resolve to cdn.nexzyapp.com — MUST be allowlisted or
        // next/image returns 400 and every image breaks.
        protocol: "https",
        hostname: "cdn.nexzyapp.com",
      },
      {
        // Legacy raw-S3 URLs (pre-CDN content, still valid — the CDN switch is
        // backward-compatible, so both hosts must be allowed).
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
      {
        // YouTube video thumbnails (video posters when a video has no explicit
        // thumbnail — we derive img.youtube.com/vi/<id>/hqdefault.jpg).
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        // YouTube thumbnail CDN mirror (i.ytimg.com serves the same posters).
        protocol: "https",
        hostname: "i.ytimg.com",
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
