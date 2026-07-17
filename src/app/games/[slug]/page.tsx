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
import { fetchGameHub, type GameHubItem } from "@/lib/blog/api";
import AppCta from "@/components/blog/AppCta";
import HubTabs, { type HubTab } from "@/components/games/HubTabs";
import { youtubeEmbedUrl } from "@/lib/blog/youtube";
import type { ReactNode } from "react";

export const revalidate = 300;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = await fetchGameHub(slug);
  if (!hub) return { title: "Game not found — Nexzy" };
  const { game } = hub;
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

function MediaPanel({
  embed,
  shots,
  name,
}: {
  embed: string | null;
  shots: string[];
  name: string;
}) {
  return (
    <Box>
      {embed && (
        <Box
          position="relative"
          w="full"
          maxW="3xl"
          aspectRatio={16 / 9}
          borderRadius="xl"
          overflow="hidden"
          bg="black"
          mb={shots.length ? 6 : 0}
          border="1px solid"
          borderColor="whiteAlpha.100"
        >
          <iframe
            src={embed}
            title={`${name} — trailer`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </Box>
      )}
      {shots.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {shots.map((src, i) => (
            <Box
              key={i}
              position="relative"
              aspectRatio={16 / 9}
              borderRadius="lg"
              overflow="hidden"
              border="1px solid"
              borderColor="whiteAlpha.100"
              bg="whiteAlpha.50"
            >
              <NextImage
                src={src}
                alt={`${name} screenshot ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 340px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
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
  const hubUrl = `${SITE_URL}/games/${game.slug}`;
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
  const hasMedia = !!embed || shots.length > 0;

  const all: GameHubItem[] = [
    ...content.walkthroughs,
    ...content.guides,
    ...content.lists,
    ...content.news,
  ];

  const videoGameLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    url: hubUrl,
    ...(game.backgroundImage ? { image: game.backgroundImage } : {}),
    ...(game.genres.length ? { genre: game.genres } : {}),
    ...(game.platforms.length ? { gamePlatform: game.platforms } : {}),
    ...(game.released ? { datePublished: game.released } : {}),
    ...(desc ? { description: desc.slice(0, 300) } : {}),
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
    name: `${game.name} — guides, walkthroughs & news`,
    url: hubUrl,
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

  const contentTabs = [
    { key: "walkthroughs", label: "Walkthroughs", items: content.walkthroughs },
    { key: "guides", label: "Guides", items: content.guides },
    { key: "lists", label: "Lists", items: content.lists },
    { key: "news", label: "News", items: content.news },
  ].filter((t) => t.items.length > 0);

  const tabs: HubTab[] = [
    ...(desc ? [{ key: "about", label: "About" }] : []),
    ...(hasMedia ? [{ key: "media", label: "Media" }] : []),
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
          media: <MediaPanel embed={embed} shots={shots} name={game.name} />,
        }
      : {}),
    ...Object.fromEntries(
      contentTabs.map((t) => [t.key, <CardGrid items={t.items} />]),
    ),
  };

  return (
    <Box>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Container maxW="5xl" py={{ base: 8, md: 12 }}>
        <HStack gap={2} mb={5} fontSize="sm" color="gray.400" flexWrap="wrap">
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/games">Games</NextLink>
          </Link>
          <Text>/</Text>
          <Text color="gray.500" lineClamp={1}>
            {game.name}
          </Text>
        </HStack>

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

        <Box mb={12}>
          <HubTabs tabs={tabs} panels={panels} />
        </Box>

        <AppCta
          variant="inline"
          location="game-hub"
          heading={`Playing ${game.name}? Get Nexzy.`}
          subtext={`Track ${game.name}, get real-time step-by-step help from the in-app AI, and earn coins — free on iOS & Android.`}
        />
      </Container>
    </Box>
  );
}
