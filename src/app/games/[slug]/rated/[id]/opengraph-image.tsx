// The rating share card (1200x630): "<player> rated <game>" with their score.
import { ImageResponse } from "next/og";
import { fetchGameHub, fetchHubReview } from "@/lib/blog/api";
import { OG_CONTENT_TYPE, OG_SIZE, brandCard, ratingCard } from "@/lib/og/card";
import { hoursLabel, platformLabel } from "@/lib/hubs/reviews";

export const alt = "A player's rating on Nexzy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const SLUG_RE = /^[a-z0-9-]{1,200}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ok = SLUG_RE.test(slug) && UUID_RE.test(id);
  const [r, hub] = ok
    ? await Promise.all([fetchHubReview(slug, id), fetchGameHub(slug).catch(() => null)])
    : [null, null];
  if (!r) {
    return new ImageResponse(
      brandCard({ eyebrow: "Nexzy Players", title: "Rate the games you play", footer: "nexzyapp.com" }),
      { ...size },
    );
  }
  return new ImageResponse(
    ratingCard({
      who: r.author ? `@${r.author.username}` : "A Nexzy player",
      game: r.game.name,
      score: r.score,
      detail: [r.dayOne ? "Day One reviewer" : null, platformLabel(r.platform), hoursLabel(r.hours)]
        .filter(Boolean)
        .join("  ·  "),
      backgroundImage: hub?.game.backgroundImage ?? null,
    }),
    { ...size },
  );
}
