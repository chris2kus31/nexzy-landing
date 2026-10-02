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
import FollowLaunch, { type Shot } from "@/components/landing/FollowLaunch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

// Fully static: the screenshot folder is read once at build time, so new
// screenshots show up on the next deploy (no code change needed).
export const dynamic = "force-static";

// Alt text for store-1..store-5, in order.
const STORE_ALTS = [
  "A game page in Nexzy with Library, Wishlist and Follow buttons and the game's player hub",
  "Nexzy wishlist with price tracking for each game",
  "A Nexzy Gamer Card profile showing library, wishlist and followed games",
  "Writing a new post in Nexzy with a game tagged",
  "Nexzy Activity with likes, replies and new followers",
];

const IMG_RE = /\.(png|jpe?g|webp|avif)$/i;

function readShots(): { shots: Shot[]; pillarShots: (string | null)[] } {
  let files: string[] = [];
  try {
    files = readdirSync(path.join(process.cwd(), "public", "follow", "shots"))
      .filter((f) => IMG_RE.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    // folder missing: sections fall back gracefully
  }
  const url = (f: string) => `/follow/shots/${encodeURIComponent(f)}`;
  const pillarShots = [1, 2, 3].map((n) => {
    const f = files.find((x) => x.toLowerCase().startsWith(`pillar-${n}`));
    return f ? url(f) : null;
  });
  const shots = files
    .filter((f) => f.toLowerCase().startsWith("store-"))
    .map((f, i) => ({
      src: url(f),
      alt: STORE_ALTS[i] ?? `Nexzy app screenshot ${i + 1}`,
    }));
  return { shots, pillarShots };
}

const TITLE = "The new Nexzy: Follow the games you love";
const DESCRIPTION =
  "Coming soon: one feed for the news, trailers and updates of every game you follow, your library and wishlist in one tap, and gamers who share your taste.";

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
        <FollowLaunch {...readShots()} />
      </main>
      <Footer />
    </>
  );
}
