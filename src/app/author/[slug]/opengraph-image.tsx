// ============================================
// FILE: app/author/[slug]/opengraph-image.tsx
// Branded 1200x630 share card for an author page. Clean navy brand card with
// the writer's name + role — real people behind the bylines (E-E-A-T).
// Next.js auto-wires this as og:image for /author/[slug].
// ============================================
import { ImageResponse } from "next/og";
import { fetchAuthorProfile } from "@/lib/blog/api";
import { getAuthorBySlug } from "@/lib/blog/authors";
import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "Nexzy writer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const staticA = getAuthorBySlug(slug);
  const db = await fetchAuthorProfile(slug);
  const name = db?.name || staticA?.name || "Nexzy Writer";
  const role = db?.title || staticA?.role || "Writer";

  return new ImageResponse(
    brandCard({
      eyebrow: "Nexzy Writer",
      title: name,
      subtitle: role,
      footer: "Real playthroughs  ·  Real reviews",
    }),
    { ...size },
  );
}
