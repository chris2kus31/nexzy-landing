// A build made on the website and shared (nexzyapp.com/drops/<slug>/b/<code>).
// The same picks always have the same code. Its link preview is the build's
// own 1.91:1 image (rendered in the background after saving; until then the
// drop's preview is used). Shows how many players share the picks. Not
// indexed: the drop page is the indexed one.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Text } from "@chakra-ui/react";
import TrendPing from "@/components/trends/TrendPing";
import BuildView from "@/components/drops/BuildView";
import { D, num } from "@/components/drops/tokens";
import {
  fetchBuild,
  fetchBuildMatches,
  fetchGameStories,
  fetchTrend,
} from "@/lib/trends/server";
import {
  BUILD_CODE_RE,
  SITE_URL,
  SLUG_RE,
  buildPath,
} from "@/lib/trends/types";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string; code: string }> };

async function load(slug: string, code: string) {
  if (!SLUG_RE.test(slug) || slug.length > 60 || !BUILD_CODE_RE.test(code))
    return null;
  const [t, b] = await Promise.all([fetchTrend(slug), fetchBuild(slug, code)]);
  return t && b ? { t, b } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, code } = await params;
  const r = await load(slug, code);
  if (!r) return { title: "Build not found", robots: { index: false } };
  const { t, b } = r;
  const title = `A #${t.hashtag} build: ${t.title}`;
  const names = b.picks
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");
  const description = `${names}${b.picks.length > 3 ? " and more" : ""}. Do you match? Make yours on Nexzy.`;
  const image = b.build.images?.link;
  const url = `${SITE_URL}${buildPath(t.slug, b.build.code)}`;
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

export default async function DropBuildPage({ params }: Params) {
  const { slug, code } = await params;
  const r = await load(slug, code);
  if (!r) notFound();
  const { t, b } = r;
  const [m, stories] = await Promise.all([
    fetchBuildMatches(t.slug, b.build.code).catch(() => null),
    fetchGameStories(b.picks.map((p) => p.id)),
  ]);
  return (
    <Box>
      <TrendPing slug={t.slug} page="entry" />
      <BuildView
        drop={t}
        heading={`A #${t.hashtag} build`}
        image={b.build.images?.portrait ?? null}
        picks={b.picks}
        stories={stories}
        proof={
          m && m.count > 0 ? (
            <Text>
              <Text as="b" color={D.white} fontSize="lg">
                {num(m.count)}
              </Text>{" "}
              {m.count === 1 ? "player shares" : "players share"} {m.threshold}{" "}
              or more of these picks on Nexzy.
            </Text>
          ) : (
            "Be one of the first to match these picks on Nexzy."
          )
        }
        location="drop_build"
      />
    </Box>
  );
}
