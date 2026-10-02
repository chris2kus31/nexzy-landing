// ============================================
// FILE: app/follow/page.tsx
// Pre-launch "coming soon" page for the Nexzy 1.1.10 rebrand
// ("Follow the games you love. And the gamers who get them.").
// Lives beside the old /app page until 1.1.10 is live in both stores; at launch
// this content replaces /app and /follow redirects there. Kept out of search
// (noindex, follow) so Google never shows a stale "coming soon" after launch.
// Linked from the Apple featuring nomination + social bios.
// ============================================
import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import path from "node:path";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import FollowLaunch from "@/components/landing/FollowLaunch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

// Fully static: the screenshot folder is read once at build time, so new
// screenshots show up on the next deploy (no code change needed).
export const dynamic = "force-static";

const IMG_RE = /\.(png|jpe?g|webp|avif)$/i;

/** Map of screenshot name (no extension, lowercase) -> public URL. */
function readShots(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const f of readdirSync(
      path.join(process.cwd(), "public", "follow", "shots"),
    )) {
      if (!IMG_RE.test(f)) continue;
      out[f.replace(IMG_RE, "").toLowerCase()] =
        `/follow/shots/${encodeURIComponent(f)}`;
    }
  } catch {
    // folder missing: sections fall back gracefully
  }
  return out;
}

const TITLE = "The new Nexzy: Follow the games you love";
const DESCRIPTION =
  "Nexzy is a gaming app, free to download: follow any game and get its news, trailers and updates in one feed, keep your library and wishlist, and meet gamers who love the same games. The new version drops Oct 21.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/follow" },
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/follow`,
    type: "website",
    images: [{ url: "/follow/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/follow/og.jpg"],
  },
};

export default function FollowPage() {
  return (
    <>
      <Navigation />
      <main>
        <FollowLaunch shots={readShots()} />
      </main>
      <Footer />
    </>
  );
}
