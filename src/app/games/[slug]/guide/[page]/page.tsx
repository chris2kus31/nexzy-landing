// A guide page of a game's mega hub ("All Song Locations", "How to Farm
// Rupees", a walkthrough chapter): blocks built in Admin -> Hub guides ->
// Pages. Indexable; the table of contents, era / spoiler choices and
// trackers are interactive. 404 unless the guide is live and the page is
// published.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import { Container, Heading, Text } from "@chakra-ui/react";
import { fetchGameHub } from "@/lib/blog/api";
import { fetchEngineGuidePage, fetchEnginePage } from "@/lib/hub-engine/server";
import { guidePath } from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";
import GuidePageBody from "@/components/games/guide/GuidePageBody";
import { jsonLdString } from "@/lib/seo/jsonld";

export const revalidate = 300;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Params = { params: Promise<{ slug: string; page: string }> };

async function load(slug: string, pageSlug: string) {
  if (!SLUG_RE.test(pageSlug) || pageSlug.length > 80) return null;
  const [hub, engine, page] = await Promise.all([
    fetchGameHub(slug),
    fetchEnginePage(slug, 300),
    fetchEngineGuidePage(slug, pageSlug),
  ]);
  if (!hub || !engine.enabled || !engine.config || !page) return null;
  return {
    config: engine.config,
    pages: engine.pages ?? [],
    counts: engine.typeCounts ?? null,
    page,
    short: hub.profile?.aliases?.[0] || hub.game.name,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, page } = await params;
  const d = await load(slug, page);
  if (!d) return { title: "Page not found", robots: { index: false } };
  const title = (d.page.seoTitle || `${d.page.title} - ${d.short} Guide`).slice(
    0,
    70,
  );
  const description = (
    d.page.seoDescription ||
    d.page.summary ||
    `${d.page.title} in ${d.short}: Nexzy's guide with maps, trackers and tips.`
  ).slice(0, 160);
  const img = d.page.blocks.find((b) => b.kind === "image");
  return {
    title,
    description,
    alternates: { canonical: guidePath(slug, page) },
    openGraph: {
      title,
      description,
      type: "article",
      ...(img && img.kind === "image" ? { images: [img.image.url] } : {}),
    },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug, page: pageSlug } = await params;
  const d = await load(slug, pageSlug);
  if (!d) notFound();
  const { page } = d;
  const url = `${SITE_URL}${guidePath(slug, page.slug)}`;
  const crumbs = [
    { name: d.short, item: `${SITE_URL}/games/${slug}` },
    { name: "Guide", item: `${SITE_URL}/games/${slug}/guide` },
    ...(page.parent
      ? [
          {
            name: page.parent.title,
            item: `${SITE_URL}${guidePath(slug, page.parent.slug)}`,
          },
        ]
      : []),
    { name: page.title, item: url },
  ];
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      ...(page.summary ? { description: page.summary } : {}),
      dateModified: page.updatedAt,
      mainEntityOfPage: url,
      about: { "@type": "VideoGame", name: d.short },
      publisher: { "@type": "Organization", name: "Nexzy" },
    },
  ];
  return (
    <Container maxW="7xl" py={{ base: 6, md: 10 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }}
      />
      <Text fontSize="sm" color={G.muted} mb={2}>
        <NextLink href={`/games/${slug}`}>{d.short}</NextLink> /{" "}
        <NextLink href={`/games/${slug}/guide`}>Guide</NextLink>
        {page.parent && (
          <>
            {" / "}
            <NextLink href={guidePath(slug, page.parent.slug)}>
              {page.parent.title}
            </NextLink>
          </>
        )}
      </Text>
      {page.parent && page.siblings > 1 && (
        <Text
          fontSize="xs"
          fontWeight="800"
          color={G.gold}
          textTransform="uppercase"
          letterSpacing="0.08em"
          mb={1}
        >
          {page.isStep ? "Step" : "Page"} {page.position} of {page.siblings}
        </Text>
      )}
      <Heading
        as="h1"
        fontSize={{ base: "2xl", md: "4xl" }}
        color="white"
        lineHeight="1.15"
      >
        {page.title}
      </Heading>
      {page.summary && (
        <Text color={G.text} fontSize="lg" mt={3} maxW="3xl">
          {page.summary}
        </Text>
      )}
      <Text fontSize="xs" color={G.muted} mt={2} mb={6}>
        Updated{" "}
        {new Date(page.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Chicago",
        })}
        . Unofficial guide by Nexzy.
      </Text>
      <GuidePageBody
        slug={slug}
        config={d.config}
        pages={d.pages}
        page={page}
        counts={d.counts}
      />
    </Container>
  );
}
