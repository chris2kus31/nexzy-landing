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
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import FollowLaunch from "@/components/landing/FollowLaunch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const revalidate = 3600;

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
        <FollowLaunch />
      </main>
      <Footer />
    </>
  );
}
