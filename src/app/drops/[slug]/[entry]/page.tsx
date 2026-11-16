// One posted build (nexzyapp.com/drops/<slug>/<entryId>): the link a shared
// entry carries. Its link preview is the entry's own 1.91:1 image, so X,
// Facebook and iMessage show the picks. Not indexed (one person's post);
// the drop page is the indexed one. Old /t/ links 301 here.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@chakra-ui/react";
import TrendPing from "@/components/trends/TrendPing";
import BuildView from "@/components/drops/BuildView";
import { fetchTrend, fetchTrendEntry } from "@/lib/trends/server";
import { SITE_URL, SLUG_RE, UUID_RE, entryPath } from "@/lib/trends/types";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string; entry: string }> };

async function load(slug: string, entry: string) {
  if (!SLUG_RE.test(slug) || slug.length > 60 || !UUID_RE.test(entry))
    return null;
  const [t, e] = await Promise.all([
    fetchTrend(slug),
    fetchTrendEntry(slug, entry),
  ]);
  return t && e ? { t, e } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, entry } = await params;
  const r = await load(slug, entry);
  if (!r) return { title: "Build not found", robots: { index: false } };
  const { t, e } = r;
  const title = `@${e.entry.author.username}'s #${t.hashtag} build`;
  const names = e.picks
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");
  const description = `${t.title}: ${names}${e.picks.length > 3 ? " and more" : ""}. Do you match? Make yours on Nexzy.`;
  const image = e.entry.trend?.images?.link;
  const url = `${SITE_URL}${entryPath(t.slug, e.entry.id)}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function DropEntryPage({ params }: Params) {
  const { slug, entry } = await params;
  const r = await load(slug, entry);
  if (!r) notFound();
  const { t, e } = r;
  const hearts = e.entry.likeCount;
  return (
    <Box>
      <TrendPing slug={t.slug} page="entry" />
      <BuildView
        drop={t}
        heading={`@${e.entry.author.username}'s #${t.hashtag}`}
        image={e.entry.trend?.images?.portrait ?? null}
        picks={e.picks}
        proof={`${hearts.toLocaleString("en-US")} ${hearts === 1 ? "heart" : "hearts"} on Nexzy`}
        location="drop_entry"
      />
    </Box>
  );
}
