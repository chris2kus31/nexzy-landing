// ============================================
// FILE: app/games/[slug]/opengraph-image.tsx
// Branded 1200x630 share card for a game hub: the game's key art scrimmed
// behind Nexzy branding, so shared links look on-brand instead of raw RAWG art.
// Next.js auto-wires this as og:image for /games/[slug].
// ============================================
import { ImageResponse } from "next/og";
import { fetchGameHub } from "@/lib/blog/api";
import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "Game hub on Nexzy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = await fetchGameHub(slug);
  const game = hub?.game;

  const genres = (game?.genres ?? []).slice(0, 3);
  const subtitle = genres.length
    ? genres.join("  ·  ")
    : (game?.platforms ?? []).slice(0, 3).join("  ·  ") || null;

  return new ImageResponse(
    brandCard({
      eyebrow: "Game Hub",
      title: game?.name ?? "Game Hub",
      subtitle,
      footer: "Guides  ·  Walkthroughs  ·  News",
      backgroundImage: game?.backgroundImage ?? null,
    }),
    { ...size },
  );
}
