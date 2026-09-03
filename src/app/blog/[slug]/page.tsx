import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  Flex,
  SimpleGrid,
  Badge,
  Link,
  Icon,
} from "@chakra-ui/react";
import { HiCalendar, HiClock } from "react-icons/hi";
import { fetchPost, fetchRelated, fetchRelatedByGame } from "@/lib/blog/api";
import { imageObjectLd } from "@/lib/blog/imageLd";
import { beatLabel, beatPalette } from "@/lib/blog/beats";
import { slugifyTag } from "@/lib/blog/tags";
import { publicPathForType } from "@/lib/blog/publicPath";
import { isPostIndexable, NOINDEX_ROBOTS } from "@/lib/blog/indexing";
import { getAuthorByName } from "@/lib/blog/authors";
import { youtubeId } from "@/lib/blog/youtube";
import type { ArticleMedia } from "@/lib/blog/api";
import ArticleBody from "@/components/blog/ArticleBody";
import AppCta from "@/components/blog/AppCta";
import Byline from "@/components/blog/Byline";
import PreferredSourceButton from "@/components/PreferredSourceButton";
import ShareRow from "@/components/blog/ShareRow";
import BlogCard from "@/components/blog/BlogCard";
import MoreOnGame from "@/components/blog/MoreOnGame";
import MediaGallery from "@/components/blog/MediaGallery";
import ArticleGallery from "@/components/blog/ArticleGallery";
import ViewPing from "@/components/blog/ViewPing";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";
import AnswerCapsule from "@/components/blog/AnswerCapsule";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import ContentComments from "@/components/comments/ContentComments";
import DealBlock from "@/components/blog/DealBlock";
import PatchBlock from "@/components/blog/PatchBlock";
import GameActionCard from "@/components/blog/GameActionCard";
import HardwareSpecBlock from "@/components/blog/HardwareSpecBlock";
import EssentialsBlock from "@/components/blog/EssentialsBlock";
import PollBlock from "@/components/blog/PollBlock";
import SourcesBlock from "@/components/blog/SourcesBlock";

// ISR: article pages are cached and rebuilt in the background (fast + crawlable).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function readingMinutes(markdown?: string): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Article not found — Nexzy News" };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title,
    description,
    // Index posture: explicit per-article flag wins, else the beat default —
    // noindex pages still publish for readers/social/app. See lib/blog/indexing.
    robots: isPostIndexable(post) ? undefined : NOINDEX_ROBOTS,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      images: post.heroImageUrl
        ? [{ url: post.heroImageUrl, alt: post.imageAlt || post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.heroImageUrl
        ? [{ url: post.heroImageUrl, alt: post.imageAlt || post.title }]
        : undefined,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  // Non-article content types have their own homes — guides (/guides/[slug],
  // HowTo schema), lists (/lists/[slug], ItemList), reviews (/reviews/[slug]),
  // rewind (/rewind/[slug]) and walkthroughs (/walkthroughs/[slug]). They all
  // share this posts/:slug fetcher, so a typed post would otherwise render as a
  // duplicate news page here. Permanently redirect (308) to the type's real
  // home instead of 404-ing, so any already-indexed /blog/<slug> passes its
  // link equity to the single canonical URL. publicPathForType returns /blog
  // for articles, so this only fires for the non-article types.
  if (post.type && post.type !== "article") {
    const home = publicPathForType(post.type);
    if (home !== "/blog") permanentRedirect(`${home}/${post.slug}`);
  }

  // Related: tag-aware (shared topic first, then same beat), excluding self.
  const related = await fetchRelated(post.slug, 3);
  const byGame = await fetchRelatedByGame(post.slug, 4);
  const byGameSlugs = new Set(byGame.items.map((p) => p.slug));
  const relatedDeduped = related.filter((p) => !byGameSlugs.has(p.slug));
  const topics = (post.tags || [])
    .map((t) => ({ label: t, slug: slugifyTag(t) }))
    .filter((t) => t.slug);

  const shareUrl = `${SITE_URL}/blog/${post.slug}`;
  const minutes = readingMinutes(post.bodyMarkdown);
  // Multi-video gallery with backward-compat fallback: use the media list when
  // present, else synthesize a single item from the legacy youtubeUrl.
  const legacyVid = youtubeId(post.youtubeUrl);
  const media: ArticleMedia[] =
    post.media && post.media.length
      ? post.media
      : post.youtubeUrl && legacyVid
        ? [
            {
              type: "youtube",
              url: post.youtubeUrl,
              videoId: legacyVid,
              thumbnailUrl: `https://i.ytimg.com/vi/${legacyVid}/hqdefault.jpg`,
              featured: true,
            },
          ]
        : [];
  // Normalize any older credit like "AI-generated (Gemini …)" to a clean label.
  const imageCredit = post.imageCredit
    ? post.imageCredit
        .replace(/\s*\(.*?\)\s*$/, "")
        .replace(/^(AI-generated|Generated with AI)$/i, "AI illustration")
    : null;

  const articleUrl = `${SITE_URL}/blog/${post.slug}`;
  const sectionLabel = beatLabel(post.beat);
  const authorPersona = getAuthorByName(post.author);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: imageObjectLd(post),
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    articleSection: sectionLabel,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    author: authorPersona
      ? {
          "@type": "Person",
          name: authorPersona.name,
          jobTitle: authorPersona.role,
          url: `${SITE_URL}/author/${authorPersona.slug}`,
          ...(authorPersona.x || authorPersona.instagram
            ? {
                sameAs: [authorPersona.x, authorPersona.instagram].filter(
                  Boolean,
                ),
              }
            : {}),
        }
      : { "@type": "Organization", name: post.author || "Nexzy Editorial" },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Nexzy",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
    },
    ...(media.length
      ? {
          video: media.map((m) => ({
            "@type": "VideoObject",
            name: m.title || post.title,
            description: post.seoDescription || post.excerpt || post.title,
            thumbnailUrl:
              m.thumbnailUrl ||
              `https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`,
            uploadDate: post.publishedAt || undefined,
            embedUrl: `https://www.youtube.com/embed/${m.videoId}`,
            contentUrl: m.url,
          })),
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Game News",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: sectionLabel,
        item: `${SITE_URL}/blog?beat=${post.beat}`,
      },
      { "@type": "ListItem", position: 4, name: post.title, item: articleUrl },
    ],
  };

  return (
    <Box>
      <Container maxW="3xl" py={{ base: 8, md: 12 }}>
        {/* Visible breadcrumb (matches BreadcrumbList JSON-LD) */}
        <HStack gap={2} mb={6} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/blog">Game News</NextLink>
          </Link>
          <Text>/</Text>
          <Link asChild color="nexzy.lightBlue">
            <NextLink href={`/blog?beat=${post.beat}`}>{sectionLabel}</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {post.title}
          </Text>
        </HStack>

        {/* Meta row */}
        <HStack gap={4} mb={4} flexWrap="wrap">
          <Badge colorPalette={beatPalette(post.beat)} variant="solid">
            {beatLabel(post.beat)}
          </Badge>
          {post.publishedAt && (
            <HStack gap={1} color="gray.400" fontSize="sm">
              <Icon>
                <HiCalendar />
              </Icon>
              <Text>
                {new Date(post.publishedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </HStack>
          )}
          <HStack gap={1} color="gray.400" fontSize="sm">
            <Icon>
              <HiClock />
            </Icon>
            <Text>{minutes} min read</Text>
          </HStack>
          <Box ml="auto">
            <ShareRow url={shareUrl} title={post.title} />
          </Box>
        </HStack>

        <Heading
          as="h1"
          fontFamily="title"
          size={{ base: "2xl", md: "4xl" }}
          color="white"
          mb={2}
          lineHeight="1.15"
        >
          {post.title}
        </Heading>
        {post.excerpt && (
          <Text color="gray.300" fontSize="lg" mb={6} lineHeight="1.6">
            {post.excerpt}
          </Text>
        )}

        <AnswerCapsule text={post.answerCapsule} />

        <Box mb={6}>
          <Byline
            author={post.author}
            date={post.publishedAt}
            updated={post.updatedAt}
          />
        </Box>

        {/* Preferred-source CTA in the byline area — the Top-Stories placement
            gaming publishers use (e.g. Focus Gaming News puts it above the
            title). Nexzy is a newsroom, so this lever is available to us: a
            reader who marks us preferred sees more of our content in Top
            Stories / Discover / AI Overviews. Becomes selectable as the domain
            gets indexed. */}
        <Box mb={8}>
          <PreferredSourceButton />
        </Box>

        {post.heroImageUrl && (
          <Box
            position="relative"
            w="full"
            aspectRatio={16 / 9}
            borderRadius="2xl"
            overflow="hidden"
            mb={2}
          >
            <Box position="absolute" inset={0} className="nexzy-img-skeleton" />
            <NextImage
              src={post.heroImageUrl}
              alt={post.imageAlt || post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              style={{ objectFit: "cover" }}
            />
          </Box>
        )}
        {imageCredit && (
          <Text
            color="gray.600"
            fontSize="11px"
            fontStyle="italic"
            textAlign="right"
            mb={8}
          >
            {imageCredit}
          </Text>
        )}

        {/* Lead video pulled high — video near the top lifts dwell time. Only
            renders for articles that carry one; text-only posts are unchanged. */}
        {media.length > 0 && (
          <Box mb={8}>
            <MediaGallery media={media} title={post.title} />
          </Box>
        )}

        {/* Beat core modules — the transactional / reference payload, high up.
            Each renders only for its beat and only when it has data. */}
        {post.beat === "deals" && <DealBlock deal={post.formatData?.deal} />}
        {post.beat === "patch_notes" && (
          <PatchBlock patch={post.formatData?.patch} />
        )}
        {post.beat === "console_hardware" && (
          <HardwareSpecBlock
            spec={post.formatData?.hardwareSpec}
            whoFor={post.formatData?.whoFor}
          />
        )}
        {post.beat === "game_movies_tv" && (
          <EssentialsBlock essentials={post.formatData?.essentials} />
        )}

        {post.bodyMarkdown && (
          <ArticleBody body={post.bodyMarkdown} location="blog" />
        )}

        {/* Article image gallery — its own thing (photos), below the body.
            Renders nothing for articles without images. */}
        <ArticleGallery images={post.images} />

        {/* Reader poll — Nexzy reports, you deliver the verdict. One tap. */}
        {post.poll && <PollBlock slug={post.slug} poll={post.poll} />}

        <SourcesBlock sources={post.sources} />

        {topics.length > 0 && (
          <Box mt={10}>
            <Heading as="h2" size="sm" color="gray.300" mb={3}>
              Topics
            </Heading>
            <HStack gap={2} flexWrap="wrap">
              {topics.map((t) => (
                <Link
                  key={t.slug}
                  asChild
                  px={3}
                  py={1}
                  borderRadius="full"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  color="gray.200"
                  fontSize="sm"
                  fontWeight="600"
                  _hover={{
                    bg: "whiteAlpha.100",
                    color: "white",
                    borderColor: "nexzy.lightBlue",
                    textDecoration: "none",
                  }}
                >
                  <NextLink href={`/blog/topic/${t.slug}`}>#{t.label}</NextLink>
                </Link>
              ))}
            </HStack>
          </Box>
        )}

        {/* Owned-audience capture — the email list the AI can't zero-click away. */}
        <Box mt={10}>
          <NewsletterSignup />
        </Box>

        {/* Make it yours — when the article is linked to a game, the funnel is
            game-specific (deep-links to that game in the app); otherwise the
            generic install band. */}
        {/* Game-specific "Make it yours" card when the article links a game —
            the per-article funnel to that game's hub. */}
        {post.game && (
          <Box mt={10}>
            <GameActionCard game={post.game} />
          </Box>
        )}

        {/* App-download CTA — shown on EVERY article (App Store + Google Play),
            even game-linked ones, so the download call-to-action is never lost. */}
        <Box mt={post.game ? 6 : 10}>
          <AppCta variant="inline" location="blog" />
        </Box>

        {/* Games in this story — one internal link per confirmed game hub when an
            article references more than one. Deeper crawl paths + reader value. */}
        {post.games && post.games.length > 1 && (
          <Box mt={8}>
            <Heading as="h2" size="sm" color="white" mb={3}>
              Games in this story
            </Heading>
            <SimpleGrid columns={{ base: 2, md: 3 }} gap={3}>
              {post.games.map((g) => (
                <NextLink
                  key={g.id}
                  href={`/games/${g.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <Box
                    position="relative"
                    borderRadius="lg"
                    overflow="hidden"
                    h="88px"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    bg="whiteAlpha.50"
                    _hover={{ borderColor: "nexzy.blue" }}
                    transition="border-color 0.15s"
                  >
                    {g.backgroundImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.backgroundImage}
                        alt={g.name}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <Box position="absolute" inset={0} bg="blackAlpha.600" />
                    <Flex position="absolute" inset={0} align="flex-end" p={3}>
                      <Text
                        color="white"
                        fontWeight="700"
                        fontSize="sm"
                        lineClamp={2}
                      >
                        {g.name}
                      </Text>
                    </Flex>
                  </Box>
                </NextLink>
              ))}
            </SimpleGrid>
          </Box>
        )}

        <HStack
          justify="space-between"
          mt={10}
          pt={6}
          borderTop="1px solid"
          borderColor="whiteAlpha.200"
        >
          <Text color="gray.500" fontSize="xs">
            {post.author || "Nexzy Editorial"}
          </Text>
          <ShareRow url={shareUrl} title={post.title} />
        </HStack>
      </Container>

      {/* Reader comments — placed right after the article (not buried under the
          "more to read" rails) so the engagement moment lands while the reader
          is still on the piece. Raises time-on-site + return visits. */}
      <ContentComments slug={post.slug} />

      {/* Related news */}
      <MoreOnGame game={byGame.game} items={byGame.items} />

      {relatedDeduped.length > 0 && (
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={12}>
          <Container maxW="container.xl">
            <Heading as="h2" size="lg" color="white" mb={6}>
              Keep reading
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              {relatedDeduped.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      <ViewPing slug={post.slug} />
      <ArticleAnalytics slug={post.slug} type="article" author={post.author} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </Box>
  );
}
