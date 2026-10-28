import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  Badge,
  Link,
  SimpleGrid,
  Icon,
} from "@chakra-ui/react";
import {
  FaWindows,
  FaPlaystation,
  FaXbox,
  FaApple,
  FaLinux,
  FaAndroid,
  FaGamepad,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import {
  fetchGameHub,
  fetchHubReviews,
  fetchHubScores,
  type GameHubItem,
  type GameHubVideo,
} from "@/lib/blog/api";
import AppCta from "@/components/blog/AppCta";
import ArticleAnalytics from "@/components/blog/ArticleAnalytics";
import GameViewPing from "@/components/games/GameViewPing";
import HubTabs, { type HubTab } from "@/components/games/HubTabs";
import GameMedia from "@/components/games/GameMedia";
import { youtubeEmbedUrl } from "@/lib/blog/youtube";
import type { ReactNode } from "react";
import { jsonLdString } from "@/lib/seo/jsonld";
import { authorJsonLd } from "@/lib/blog/authors";
import type { DayOnePlatform, HubProfile } from "@/lib/hubs/types";
import HubLiveProvider from "@/components/games/hub/HubLiveProvider";
import LaunchCountdown from "@/components/games/hub/LaunchCountdown";
import DayOneCard from "@/components/games/hub/DayOneCard";
import PredictScore from "@/components/games/hub/PredictScore";
import HubTrailers, { type HubTrailer } from "@/components/games/hub/HubTrailers";
import HubScores from "@/components/games/hub/HubScores";
import type { HubReviewPage, HubScores as HubScoresData } from "@/lib/hubs/reviews";
import {
  EditionsTable,
  EverythingWeKnow,
  HubFaqList,
  HubPanel,
  LatestNews,
  ShortVersion,
  fmtHubDate,
} from "@/components/games/hub/HubSections";

export const revalidate = 21600; // 6 h; the publish webhook refreshes every hub instantly
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

const TYPE_BADGE: Record<string, { label: string; palette: string }> = {
  guide: { label: "Guide", palette: "cyan" },
  walkthrough: { label: "Walkthrough", palette: "orange" },
  list: { label: "List", palette: "purple" },
  article: { label: "News", palette: "blue" },
};
const badgeFor = (t: string) => TYPE_BADGE[t] ?? TYPE_BADGE.article;

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function platformIcons(platforms: string[]): IconType[] {
  const set = new Map<string, IconType>();
  for (const p of platforms) {
    const s = p.toLowerCase();
    if (s.includes("playstation")) set.set("ps", FaPlaystation);
    else if (s.includes("xbox")) set.set("xbox", FaXbox);
    else if (s.includes("pc") || s.includes("windows"))
      set.set("pc", FaWindows);
    else if (s.includes("nintendo") || s.includes("switch"))
      set.set("nin", FaGamepad);
    else if (s.includes("mac") || s.includes("ios")) set.set("apple", FaApple);
    else if (s.includes("android")) set.set("android", FaAndroid);
    else if (s.includes("linux")) set.set("linux", FaLinux);
    else set.set("other", FaGamepad);
  }
  return [...set.values()];
}

/** Game platform names -> the Day One platform picks we offer. */
function dayOnePlatforms(platforms: string[]): DayOnePlatform[] {
  const out = new Set<DayOnePlatform>();
  for (const p of platforms) {
    const s = p.toLowerCase();
    if (s.includes("playstation 5")) out.add("ps5");
    else if (s.includes("xbox series")) out.add("xbox");
    else if (s.includes("switch 2")) out.add("switch2");
    else if (s.includes("switch")) out.add("switch");
    else if (s === "pc" || s.includes("windows")) out.add("pc");
  }
  return [...out];
}

/**
 * Official trailers for the hub: videos linked to the game from outside Nexzy
 * (trailer monitor approvals / Admin -> Game hub) plus the game's trailer
 * field. Nexzy's own clips and article embeds stay in the Media tab.
 */
function hubTrailers(
  videos: GameHubVideo[],
  name: string,
): HubTrailer[] {
  return videos
    .filter(
      (v) =>
        (v.source === "external" || v.source === "rawg") &&
        !v.isShort &&
        !!v.youtubeId,
    )
    .slice(0, 8)
    .map((v) => ({
      youtubeId: v.youtubeId as string,
      title: v.title?.trim() || `${name}: official video`,
      thumbnailUrl: v.thumbnailUrl,
    }));
}

/** Title for an enabled mega hub: entity first, under 60 with " | Nexzy". */
function megaTitle(name: string, profile: HubProfile): string {
  if (profile.seoTitle) return profile.seoTitle;
  const short = profile.aliases[0] || name;
  const full = `${short}: Release Date, Price & Everything We Know`;
  if (full.length <= 52) return full;
  const mid = `${short}: Release Date & Everything We Know`;
  return mid.length <= 52 ? mid : short;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = await fetchGameHub(slug);
  if (!hub) return { title: "Game not found — Nexzy" };
  const { game } = hub;
  const profile = hub.profile ?? null;
  if (profile) {
    const title = megaTitle(game.name, profile);
    const description = (
      profile.seoDescription ||
      profile.summary ||
      `Everything we know about ${game.name}: release date, price, editions and every confirmed detail, sourced.`
    ).slice(0, 160);
    return {
      title,
      description,
      alternates: { canonical: `/games/${game.slug}` },
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary_large_image", title, description },
    };
  }
  const description =
    (game.description
      ? stripHtml(game.description).slice(0, 155)
      : `Every Nexzy guide, walkthrough, list and news story for ${game.name} — in one place.`) ||
    undefined;
  return {
    title: `${game.name} — Guides, Walkthroughs & News`,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      title: `${game.name} on Nexzy`,
      description,
      type: "website",
      // og:image comes from the co-located branded opengraph-image.tsx.
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.name} on Nexzy`,
      description,
      // twitter:image comes from the co-located twitter-image.tsx.
    },
  };
}

function HubCard({ item }: { item: GameHubItem }) {
  const b = badgeFor(item.type);
  return (
    <NextLink href={item.path} style={{ display: "block", height: "100%" }}>
      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="nexzy.blue/20"
        borderRadius="xl"
        overflow="hidden"
        h="full"
        display="flex"
        flexDirection="column"
        transition="all 0.2s"
        _hover={{
          borderColor: "nexzy.blue/60",
          transform: "translateY(-4px)",
          shadow: "lg",
        }}
      >
        {item.heroImageUrl && (
          <Box position="relative" w="full" aspectRatio={16 / 9}>
            <NextImage
              src={item.heroImageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              style={{ objectFit: "cover" }}
            />
          </Box>
        )}
        <Box p={4} flex="1" display="flex" flexDirection="column" gap={2}>
          <Badge
            colorPalette={b.palette}
            variant="subtle"
            alignSelf="flex-start"
          >
            {b.label}
          </Badge>
          <Heading as="h3" size="sm" color="white" lineClamp={2}>
            {item.title}
          </Heading>
          {item.excerpt && (
            <Text color="gray.400" fontSize="sm" lineClamp={2}>
              {item.excerpt}
            </Text>
          )}
        </Box>
      </Box>
    </NextLink>
  );
}

function CardGrid({ items }: { items: GameHubItem[] }) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={5}>
      {items.map((it) => (
        <HubCard key={it.slug} item={it} />
      ))}
    </SimpleGrid>
  );
}

export default async function GameHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = await fetchGameHub(slug);
  if (!hub) notFound();
  const { game, content } = hub;
  const profile = hub.profile ?? null;
  // Ratings (Phase 2): only for mega hubs with the Scores module on.
  const emptyReviews: HubReviewPage = { items: [], nextCursor: null };
  const [scores, reviews] = profile?.modules.scores
    ? await Promise.all([fetchHubScores(game.slug), fetchHubReviews(game.slug)])
    : [null, emptyReviews];
  // AggregateRating = Nexzy Players only, and only once the score is shown on
  // the page (10+ ratings). Critics are never marked up (not our ratings).
  const players = scores?.players;
  const aggregateRating =
    players && players.score != null && players.count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: players.score.toFixed(1),
          bestRating: "10",
          worstRating: "1",
          ratingCount: players.count,
        }
      : null;
  const hubUrl = `${SITE_URL}/games/${game.slug}`;
  const gameId = `${hubUrl}#game`;
  const icons = platformIcons(game.platforms);
  const releasedFuture = game.released
    ? new Date(game.released).getTime() > Date.now()
    : false;
  const metaBits = [
    ...game.genres.slice(0, 3),
    ...(game.released ? [fmtDate(game.released)] : []),
  ];
  const desc = game.description ? stripHtml(game.description) : "";
  const embed = youtubeEmbedUrl(game.clipUrl);
  const shots = game.screenshots ?? [];
  const videos = hub.videos ?? [];
  const hasMedia = videos.length > 0 || shots.length > 0;

  const all: GameHubItem[] = [
    ...content.walkthroughs,
    ...content.guides,
    ...content.lists,
    ...content.news,
  ];

  const videoGameLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "@id": gameId,
    name: game.name,
    url: hubUrl,
    ...(profile?.aliases.length ? { alternateName: profile.aliases } : {}),
    ...(profile?.publisher
      ? { publisher: { "@type": "Organization", name: profile.publisher } }
      : {}),
    ...(profile?.officialLinks.length
      ? { sameAs: profile.officialLinks.map((l) => l.url) }
      : {}),
    ...(game.backgroundImage ? { image: game.backgroundImage } : {}),
    ...(game.genres.length ? { genre: game.genres } : {}),
    ...(game.platforms.length ? { gamePlatform: game.platforms } : {}),
    ...(game.released ? { datePublished: game.released } : {}),
    ...(desc ? { description: desc.slice(0, 300) } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    // Trailer as a VideoObject so the embed is a first-class video entity for
    // AI/GEO. uploadDate is intentionally omitted (RAWG clip data carries no
    // true upload date and we never fabricate one), so it won't chase the video
    // rich result until a real date exists, but the video is still understood.
    ...(embed && (game.backgroundImage || shots[0])
      ? {
          video: {
            "@type": "VideoObject",
            name: `${game.name} trailer`,
            description: desc
              ? desc.slice(0, 200)
              : `Official trailer for ${game.name}.`,
            thumbnailUrl: [game.backgroundImage || shots[0]],
            embedUrl: embed,
            ...(game.clipUrl ? { contentUrl: game.clipUrl } : {}),
          },
        }
      : {}),
  };
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: profile
      ? `${game.name}: everything we know`
      : `${game.name} — guides, walkthroughs & news`,
    url: hubUrl,
    about: { "@id": gameId },
    ...(profile?.factsUpdatedAt ? { dateModified: profile.factsUpdatedAt } : {}),
    ...(profile?.editor ? { author: authorJsonLd(profile.editor, SITE_URL) } : {}),
    isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: all.length,
      itemListElement: all.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}${it.path}`,
        name: it.title,
      })),
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Games",
        item: `${SITE_URL}/games`,
      },
      { "@type": "ListItem", position: 3, name: game.name, item: hubUrl },
    ],
  };

  // Visible FAQ only (Google retired FAQ rich results in 2026; the markup is
  // kept because it mirrors the page text exactly and other engines read it).
  const faqLd =
    profile?.modules.faq && profile.faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: profile.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  // Trailers. No VideoObject markup yet: we only know when a video was added
  // to Nexzy, not its YouTube upload date, and we never publish a wrong date.
  const trailers =
    profile && profile.modules.trailers ? hubTrailers(videos, game.name) : [];

  const contentTabs = [
    { key: "walkthroughs", label: "Walkthroughs", items: content.walkthroughs },
    { key: "guides", label: "Guides", items: content.guides },
    { key: "lists", label: "Lists", items: content.lists },
    { key: "news", label: "News", items: content.news },
  ].filter((t) => t.items.length > 0);

  const tabs: HubTab[] = [
    ...(desc ? [{ key: "about", label: "About" }] : []),
    ...(hasMedia
      ? [{ key: "media", label: "Media", count: videos.length + shots.length }]
      : []),
    ...contentTabs.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.items.length,
    })),
  ];
  const panels: Record<string, ReactNode> = {
    ...(desc
      ? {
          about: (
            <Box maxW="3xl">
              <Text color="gray.300" lineHeight="1.8">
                {desc}
              </Text>
            </Box>
          ),
        }
      : {}),
    ...(hasMedia
      ? {
          media: <GameMedia videos={videos} shots={shots} name={game.name} />,
        }
      : {}),
    ...Object.fromEntries(
      contentTabs.map((t) => [t.key, <CardGrid items={t.items} />]),
    ),
  };

  return (
    <Box>
      <ArticleAnalytics slug={game.slug} type="game" />
      <GameViewPing slug={game.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(videoGameLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(faqLd) }}
        />
      )}

      <Container maxW={profile ? "6xl" : "5xl"} py={{ base: 8, md: 12 }}>
        <HStack gap={2} mb={5} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/games">Games</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {game.name}
          </Text>
        </HStack>

        {profile ? (
          <HubLiveProvider
            slug={game.slug}
            gameName={profile.aliases[0] || game.name}
            initial={profile.live}
          >
            <MegaHub
              game={game}
              profile={profile}
              news={content.news.slice(0, 4)}
              trailers={trailers}
              scores={scores}
              reviews={reviews}
            />
          </HubLiveProvider>
        ) : (
          <>
          {/* Contained hero banner */}
          <Box
            position="relative"
            borderRadius="2xl"
            overflow="hidden"
            border="1px solid"
            borderColor="whiteAlpha.100"
            aspectRatio={{ base: 16 / 9, md: 2.6 }}
            mb={6}
          >
            {game.backgroundImage && (
              <NextImage
                src={game.backgroundImage}
                alt={game.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 960px"
                style={{ objectFit: "cover" }}
              />
            )}
            <Box
              position="absolute"
              inset={0}
              style={{
                background:
                  "linear-gradient(to top, rgba(16,18,34,0.9) 0%, rgba(16,18,34,0.25) 45%, rgba(16,18,34,0) 75%)",
              }}
            />
            {icons.length > 0 && (
              <HStack position="absolute" bottom={4} left={5} gap={3}>
                {icons.map((Ic, i) => (
                  <Icon key={i} boxSize={5} color="whiteAlpha.900">
                    <Ic />
                  </Icon>
                ))}
              </HStack>
            )}
          </Box>

          <Heading
            as="h1"
            fontFamily="title"
            size={{ base: "2xl", md: "3xl" }}
            color="white"
            lineHeight="1.1"
            mb={2}
          >
            {game.name}
          </Heading>

          {metaBits.length > 0 && (
            <Text color="gray.400" fontSize={{ base: "sm", md: "md" }} mb={4}>
              {metaBits.join("  ·  ")}
            </Text>
          )}

          <HStack gap={2} flexWrap="wrap" mb={8}>
            {game.genres.slice(0, 4).map((g) => (
              <Badge key={g} colorPalette="blue" variant="subtle">
                {g}
              </Badge>
            ))}
            {game.released && (
              <Badge colorPalette="yellow" variant="subtle">
                {releasedFuture
                  ? `Coming ${fmtDate(game.released)}`
                  : `Released ${fmtDate(game.released)}`}
              </Badge>
            )}
          </HStack>
          </>
        )}

        <Box mb={12}>
          {profile && tabs.length > 0 && (
            <Heading
              as="h2"
              fontFamily="heading"
              fontSize={{ base: "xl", md: "2xl" }}
              color="white"
              mb={2}
            >
              {game.name} guides, news and media
            </Heading>
          )}
          <HubTabs tabs={tabs} panels={panels} />
        </Box>

        <AppCta
          variant="inline"
          location="game-hub"
          heading={`Follow ${game.name} on Nexzy`}
          subtext={`Get ${game.name} news, trailers and updates in one feed, add it to your library or wishlist in one tap, and meet players who play it. Free on iOS & Android.`}
        />
      </Container>
    </Box>
  );
}

/** Phase 1 mega hub: hero (countdown + Day One), the short version, predict,
 *  everything we know, editions, latest news and FAQ. Modules follow the
 *  game's profile switches. */
function MegaHub({
  game,
  profile,
  news,
  trailers,
  scores,
  reviews,
}: {
  game: NonNullable<Awaited<ReturnType<typeof fetchGameHub>>>["game"];
  profile: HubProfile;
  news: GameHubItem[];
  trailers: HubTrailer[];
  scores: HubScoresData | null;
  reviews: HubReviewPage;
}) {
  const m = profile.modules;
  const short = profile.aliases[0] || game.name;
  const launchAt =
    profile.launchAt ||
    (game.released ? `${game.released}T12:00:00.000Z` : null);
  const platformLine = game.platforms.slice(0, 4).join(" · ");
  const picks = dayOnePlatforms(game.platforms);
  // After launch the ratings lead the page; before it, they sit under Predict.
  const scoresPanel =
    m.scores && scores ? (
      <HubPanel
        id="scores"
        title={`${short} review scores: critics vs players`}
        aside={scores.open ? "Rated by real players" : "Opens at launch"}
      >
        <HubScores
          slug={game.slug}
          gameName={short}
          initialScores={scores}
          initialReviews={reviews}
        />
      </HubPanel>
    ) : null;
  return (
    <Box display="flex" flexDirection="column" gap={7} mb={12}>
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1.1fr) minmax(0, 1fr)" }}
        gap={{ base: 6, lg: 8 }}
        alignItems="stretch"
      >
        <Box display="flex" flexDirection="column" gap={5}>
          <HStack gap={2} flexWrap="wrap">
            <Badge
              bg="rgba(255,215,0,0.14)"
              color="#FFD700"
              borderRadius="999px"
              px={3}
              py={1}
              letterSpacing="0.05em"
            >
              OFFICIAL NEXZY HUB
            </Badge>
            {platformLine && (
              <Badge bg="whiteAlpha.100" color="#EDF2F7" borderRadius="999px" px={3} py={1}>
                {platformLine}
              </Badge>
            )}
          </HStack>
          <Heading
            as="h1"
            fontFamily="title"
            fontSize={{ base: "4xl", md: "6xl" }}
            color="white"
            lineHeight="1"
          >
            {profile.headline || game.name}
          </Heading>
          {m.countdown && launchAt && (
            <LaunchCountdown
              launchAt={launchAt}
              launchLabel={fmtHubDate(launchAt)}
            />
          )}
          {profile.launchNote && (
            <Text fontSize="sm" color="#9aa3bf" mt={-2}>
              {profile.launchNote}
            </Text>
          )}
          {m.dayOne && <DayOneCard platforms={picks} />}
        </Box>
        <Box
          position="relative"
          borderRadius="18px"
          overflow="hidden"
          border="1px solid"
          borderColor="whiteAlpha.100"
          minH={{ base: "200px", lg: "100%" }}
          aspectRatio={{ base: 16 / 9, lg: "auto" }}
          bg="#11152b"
        >
          {game.backgroundImage && (
            <NextImage
              src={game.backgroundImage}
              alt={`${game.name} key art`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
              style={{ objectFit: "cover" }}
            />
          )}
        </Box>
      </Box>

      {profile.summary && (
        <ShortVersion
          gameName={short}
          summary={profile.summary}
          updatedAt={profile.factsUpdatedAt}
          editor={profile.editor}
        />
      )}

      {scores?.open && scoresPanel}

      {trailers.length > 0 && (
        <HubPanel
          id="trailers"
          title={`${short} trailers`}
          aside="Official videos"
        >
          <HubTrailers slug={game.slug} trailers={trailers} />
        </HubPanel>
      )}

      {m.predict && (
        <HubPanel
          id="predict"
          title="Predict the Nexzy Players score"
          aside="Real score unlocks after launch"
        >
          <PredictScore />
        </HubPanel>
      )}

      {!scores?.open && scoresPanel}

      {m.facts && (
        <EverythingWeKnow
          gameName={short}
          facts={profile.facts}
          updatedAt={profile.factsUpdatedAt}
        />
      )}

      {m.editions && <EditionsTable gameName={short} editions={profile.editions} />}

      <LatestNews gameName={short} items={news} />

      {m.faq && <HubFaqList gameName={short} faqs={profile.faqs} />}
    </Box>
  );
}
