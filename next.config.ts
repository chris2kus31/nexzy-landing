import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EC2 (nexzy-web) builds set NEXT_OUTPUT_STANDALONE=1 in the GitHub workflow
  // to get a minimal server.js for PM2. Netlify never sets it, so its builds
  // are unchanged.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
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
  // Baseline security headers. Deliberately NOT a full CSP (that's a bigger,
  // riskier project): HSTS without includeSubDomains so cdn./api. subdomains
  // are unaffected, nosniff, a sane referrer policy, and anti-clickjacking on
  // the admin only.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Launch day (Oct 21, 2026): the pre-launch /follow page moved to /app.
      { source: "/follow", destination: "/app", permanent: true },
      // Trends became Drops (Nov 2026). Shared /t/ links and images keep
      // working; the query (?s= share source) is passed along.
      { source: "/trends", destination: "/drops", permanent: true },
      { source: "/t/:slug", destination: "/drops/:slug", permanent: true },
      {
        source: "/t/:slug/:entry",
        destination: "/drops/:slug/:entry",
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
        // Same-origin fallback for guide MAP ART. The map draws art with
        // WebGL, which needs a CORS-approved copy from the CDN; when a
        // CloudFront location serves a response without the CORS header
        // (seen in prod: one pop lagging the SimpleCORS policy), the map
        // retries through this path. Same origin = no CORS involved at all.
        source: "/cdn-hub/:path*",
        destination: "https://cdn.nexzyapp.com/hub/:path*",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/android-assetlinks",
      },
    ];
  },
};

export default nextConfig;
