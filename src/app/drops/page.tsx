// Nexzy Drops (nexzyapp.com/drops): the marketing home of every drop. A
// drop asks one question about your games; you pick, share your build, and
// the app shows who matches. Approved mockups: boards 21-22.
//
// Everything on the page is real data from the API (counts, covers, picks,
// builds). Sections with nothing to show yet are left out, never faked.
// 404 while the API's TRENDS_ENABLED is off.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import BuildCard from "@/components/drops/BuildCard";
import DropsGrid from "@/components/drops/DropsGrid";
import MostPicked, { type MostPickedDrop } from "@/components/drops/MostPicked";
import NextDropStrip from "@/components/drops/NextDropStrip";
import StoreButtons from "@/components/drops/StoreButtons";
import EntryCard from "@/components/trends/EntryCard";
import { D, num } from "@/components/drops/tokens";
import {
  fetchDropsPage,
  fetchTrendEntries,
  fetchTrendPicks,
} from "@/lib/trends/server";
import { jsonLdString } from "@/lib/seo/jsonld";
import {
  SITE_URL,
  dropPath,
  type DropCard,
  type TrendEntryRow,
} from "@/lib/trends/types";

export const revalidate = 120;

const TITLE = "Nexzy Drops: share your favorite games and find who matches";
const DESCRIPTION =
  "A new drop every week. Pick your games for #GameDNA and more, share your build, and find the players who picked the same ones on Nexzy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/drops` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/drops`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQ: Array<[string, string]> = [
  [
    "What is a Nexzy Drop?",
    "A drop is a prompt about the games you love, like the 9 games that made you or the 3 you would take to a desert island. You pick your games, get a build you can share anywhere, and see which players picked the same ones.",
  ],
  [
    "Do I need an account to make a build?",
    "No. Anyone can make and share a build on the web. Post it in the Nexzy app to see who matches you, follow them and start a Squad Room together.",
  ],
  [
    "How often are new drops released?",
    "Every week, plus special drops around big moments like The Game Awards and major releases.",
  ],
  [
    "How does matching work?",
    "When you post a build, Nexzy compares it with every other build in that drop and shows the players who picked about half or more of the same games.",
  ],
];

const STEPS: Array<[string, string]> = [
  ["Post your build", "One tap from the web or the app."],
  ["See who matches", "Ranked by how many picks you share."],
  ["Follow and squad up", "Start a Squad Room with your matches."],
];

function H2({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <Box>
      <Heading
        as="h2"
        fontFamily="title"
        fontWeight="700"
        fontSize={{ base: "3xl", md: "4xl" }}
        lineHeight="1.05"
      >
        {children}
      </Heading>
      {sub && (
        <Text color={D.muted} mt={2} maxW="560px" lineHeight="1.5">
          {sub}
        </Text>
      )}
    </Box>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Box>
      <Text
        fontFamily="title"
        fontWeight="700"
        fontSize={{ base: "2xl", md: "4xl" }}
        lineHeight="1"
      >
        {num(value)}
      </Text>
      <Text fontSize="sm" color={D.muted} mt={1.5}>
        {label}
      </Text>
    </Box>
  );
}

/** The hero's fanned builds: up to 3 live drops that have covers. */
function HeroFan({ drops, small }: { drops: DropCard[]; small?: boolean }) {
  const withCovers = drops.filter((d) => d.covers.length > 0).slice(0, 3);
  const cards = withCovers.length ? withCovers : drops.slice(0, 1);
  if (!cards.length) return null;
  const [front, left, right] = [cards[0], cards[1], cards[2]];
  const big = small ? 210 : 300;
  const side = small ? 160 : 240;
  return (
    <Box position="relative" h={small ? "330px" : "560px"} w="100%">
      {left && (
        <Box
          position="absolute"
          left={small ? "0" : "0"}
          top={small ? "50px" : "90px"}
        >
          <BuildCard
            hashtag={left.hashtag}
            line={left.title}
            covers={left.covers}
            width={side}
            rotate={-9}
          />
        </Box>
      )}
      {right && (
        <Box position="absolute" right="0" top={small ? "60px" : "110px"}>
          <BuildCard
            hashtag={right.hashtag}
            line={right.title}
            covers={right.covers}
            width={side}
            rotate={8}
          />
        </Box>
      )}
      <Box
        position="absolute"
        left="50%"
        top={small ? "0" : "20px"}
        transform="translateX(-50%)"
        zIndex={2}
      >
        <BuildCard
          hashtag={front.hashtag}
          line={front.title}
          covers={front.covers}
          width={big}
          rotate={-1}
        />
      </Box>
    </Box>
  );
}

export default async function DropsPage() {
  const page = await fetchDropsPage();
  if (!page) notFound();

  const featured = page.live[0] ?? null;
  const next = page.soon[0] ?? null;
  const active = page.live.filter((d) => d.entryCount > 0).slice(0, 4);
  const [pickLists, entryLists] = await Promise.all([
    Promise.all(active.map((d) => fetchTrendPicks(d.slug).catch(() => []))),
    Promise.all(
      active
        .slice(0, 3)
        .map((d) =>
          fetchTrendEntries(d.slug, "top", 3).catch(
            () => [] as TrendEntryRow[],
          ),
        ),
    ),
  ]);
  const mostPicked: MostPickedDrop[] = active
    .map((d, i) => ({
      slug: d.slug,
      hashtag: d.hashtag,
      picks: pickLists[i] ?? [],
    }))
    .filter((d) => d.picks.length > 0);
  const sharing = active
    .slice(0, 3)
    .flatMap((d, i) =>
      (entryLists[i] ?? [])
        .filter((e) => e.trend?.images?.portrait)
        .map((e) => ({ drop: d, entry: e })),
    )
    .slice(0, 3);

  const ctaHref = featured ? `${dropPath(featured.slug)}#make` : "#drops";
  const ctaLabel = featured
    ? `Make your #${featured.hashtag} build`
    : "See the drops";

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Nexzy Drops",
      description: DESCRIPTION,
      url: `${SITE_URL}/drops`,
      isPartOf: { "@type": "WebSite", name: "Nexzy", url: SITE_URL },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: page.live.length,
        itemListElement: page.live.map((d, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}${dropPath(d.slug)}`,
          name: `#${d.hashtag}: ${d.title}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Nexzy", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Drops",
          item: `${SITE_URL}/drops`,
        },
      ],
    },
  ];

  return (
    <Box position="relative" overflow="hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }}
      />
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        bgImage={`linear-gradient(rgba(59,107,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,107,255,0.05) 1px, transparent 1px)`}
        bgSize="32px 32px"
      />
      <Box
        position="absolute"
        top="40px"
        right={{ base: "-200px", md: "-60px" }}
        w="820px"
        h="820px"
        pointerEvents="none"
        bg="radial-gradient(circle, rgba(255,210,74,0.14), transparent 62%)"
      />

      <Container maxW="1200px" px={{ base: 4, md: 10 }} position="relative">
        {/* Hero */}
        <Flex
          pt={{ base: 7, md: 16 }}
          gap={{ base: 2, md: 8 }}
          direction={{ base: "column", lg: "row" }}
          align={{ lg: "center" }}
        >
          <Box flex="1" minW={0}>
            <Flex align="baseline" gap={2.5} wrap="wrap">
              <Text
                fontFamily="title"
                fontWeight="700"
                fontSize={{ base: "lg", md: "xl" }}
                color={D.yellow}
              >
                Nexzy Drops
              </Text>
              <Text fontSize="sm" color={D.muted}>
                New drop every week
              </Text>
            </Flex>
            <Heading
              as="h1"
              fontFamily="title"
              fontWeight="700"
              fontSize={{ base: "46px", md: "84px" }}
              lineHeight="0.95"
              letterSpacing={{ base: "-0.5px", md: "-1.5px" }}
              mt={{ base: 3, md: 4 }}
            >
              Your games, curated by you.
            </Heading>
            <Text
              fontSize={{ base: "md", md: "xl" }}
              color={D.dim}
              mt={{ base: 3.5, md: 5 }}
              maxW="520px"
              lineHeight="1.5"
            >
              Pick your games, share your build, and find the players who picked
              the same ones.
            </Text>
            <Box display={{ base: "block", lg: "none" }} mt={6}>
              <HeroFan drops={page.live} small />
            </Box>
            <Flex
              gap={3}
              mt={{ base: 2, lg: 8 }}
              wrap="wrap"
              direction={{ base: "column", sm: "row" }}
            >
              <Button
                asChild
                h="54px"
                px={6}
                borderRadius="14px"
                bg={D.yellow}
                color={D.base}
                fontWeight="900"
                fontSize="md"
                boxShadow="0 12px 34px rgba(255,210,74,0.28)"
                _hover={{ opacity: 0.92 }}
              >
                <NextLink href={ctaHref}>{ctaLabel}</NextLink>
              </Button>
              <Button
                asChild
                h="54px"
                px={5}
                borderRadius="14px"
                variant="outline"
                borderColor={D.line}
                borderWidth="1.5px"
                color={D.white}
                fontWeight="700"
                _hover={{ bg: "rgba(255,255,255,0.04)" }}
              >
                <a href="#drops">See all drops</a>
              </Button>
            </Flex>
            {page.totals.builds > 0 && (
              <SimpleGrid
                columns={3}
                gap={{ base: 3, md: 10 }}
                mt={{ base: 6, md: 11 }}
                maxW="520px"
              >
                <Stat value={page.totals.builds} label="builds made" />
                <Stat value={page.totals.shares} label="builds shared" />
                <Stat value={page.totals.matched} label="players matched" />
              </SimpleGrid>
            )}
          </Box>
          <Box w="520px" flexShrink={0} display={{ base: "none", lg: "block" }}>
            <HeroFan drops={page.live} />
          </Box>
        </Flex>

        {next && (
          <Box mt={{ base: 8, md: 14 }}>
            <NextDropStrip drop={next} />
          </Box>
        )}

        {/* Drops */}
        <Box id="drops" mt={{ base: 12, md: 24 }} scrollMarginTop="90px">
          <H2 sub="Each drop asks one question about your games. Pick, share, compare.">
            Drops
          </H2>
          <Box mt={6}>
            <DropsGrid page={page} />
          </Box>
        </Box>

        {/* Matching (the app) */}
        <Flex
          mt={{ base: 14, md: 28 }}
          gap={{ base: 8, md: 14 }}
          direction={{ base: "column", lg: "row" }}
          align={{ lg: "center" }}
        >
          <Box flex="1" minW={0}>
            <H2 sub="Post your build in the Nexzy app and see every player who picked the same games. Follow the ones you match, then start a Squad Room together.">
              Find your player 2
            </H2>
            <Stack gap={3.5} mt={7}>
              {STEPS.map(([t, s], i) => (
                <Flex key={t} gap={3.5} align="flex-start">
                  <Flex
                    w="30px"
                    h="30px"
                    flexShrink={0}
                    borderRadius="8px"
                    bg="rgba(255,210,74,0.14)"
                    color={D.yellow}
                    fontFamily="title"
                    fontWeight="700"
                    align="center"
                    justify="center"
                  >
                    {i + 1}
                  </Flex>
                  <Box>
                    <Text fontWeight="800">{t}</Text>
                    <Text fontSize="sm" color={D.muted}>
                      {s}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </Stack>
            <Box mt={7}>
              <StoreButtons location="drops_match" />
            </Box>
          </Box>
          <MatchIllustration />
        </Flex>

        {/* Community: builds + most picked */}
        {(sharing.length > 0 || mostPicked.length > 0) && (
          <Flex
            mt={{ base: 14, md: 28 }}
            gap={{ base: 12, md: 14 }}
            direction={{ base: "column", lg: "row" }}
          >
            {sharing.length > 0 && (
              <Box flex="1" minW={0}>
                <H2 sub="Fresh from the community this week.">
                  Builds people are sharing
                </H2>
                <SimpleGrid columns={{ base: 2, md: 3 }} gap={4} mt={7}>
                  {sharing.map(({ drop, entry }) => (
                    <EntryCard
                      key={entry.id}
                      slug={drop.slug}
                      hashtag={drop.hashtag}
                      entry={entry}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}
            {mostPicked.length > 0 && (
              <Box w={{ base: "100%", lg: "460px" }} flexShrink={0}>
                <H2>Most picked</H2>
                <Box mt={7}>
                  <MostPicked drops={mostPicked} />
                </Box>
              </Box>
            )}
          </Flex>
        )}

        {/* App */}
        <Box
          mt={{ base: 14, md: 28 }}
          position="relative"
          borderRadius={{ base: "24px", md: "28px" }}
          overflow="hidden"
          bg="linear-gradient(120deg, #1E2560, #2A1F5E 60%, #3A2A12)"
          border="1px solid"
          borderColor={D.line}
          px={{ base: 5, md: 14 }}
          pt={{ base: 7, md: 14 }}
          pb={{ base: 0, md: 0 }}
          h={{ md: "500px" }}
        >
          <Flex gap={10} direction={{ base: "column", md: "row" }} h="100%">
            <Box flex="1" minW={0} alignSelf={{ md: "center" }} pb={{ md: 14 }}>
              <H2>Drops live in the app</H2>
              <Text
                color={D.dim}
                fontSize={{ base: "md", md: "lg" }}
                mt={3.5}
                maxW="520px"
                lineHeight="1.55"
              >
                Build from your Nexzy library and wishlist, get a ping when a
                new drop goes live, and keep every build on your profile.
              </Text>
              <Box mt={7}>
                <StoreButtons location="drops_app_band" playYellow />
              </Box>
            </Box>
            <Box
              w={{ base: "260px", md: "300px" }}
              mx={{ base: "auto", md: 0 }}
              flexShrink={0}
              alignSelf="flex-end"
              mb={{ base: "-120px", md: "-140px" }}
              h={{ base: "400px", md: "auto" }}
            >
              <PhoneFrame drop={featured} />
            </Box>
          </Flex>
        </Box>

        {/* FAQ */}
        <Flex
          mt={{ base: 14, md: 28 }}
          gap={{ base: 6, md: 14 }}
          direction={{ base: "column", md: "row" }}
        >
          <Box w={{ md: "320px" }} flexShrink={0}>
            <H2>Questions</H2>
          </Box>
          <Box flex="1" minW={0}>
            {FAQ.map(([q, a], i) => (
              <Box
                as="details"
                key={q}
                borderTop="1px solid"
                borderColor={D.line}
                py={4}
                {...(i === 0 ? { open: true } : {})}
              >
                <Box
                  as="summary"
                  cursor="pointer"
                  fontWeight="700"
                  fontSize={{ base: "md", md: "lg" }}
                  listStyleType="none"
                  _focusVisible={{
                    outline: `2px solid ${D.yellow}`,
                    outlineOffset: "4px",
                  }}
                >
                  {q}
                </Box>
                <Text color={D.dim} mt={2.5} lineHeight="1.6" maxW="680px">
                  {a}
                </Text>
              </Box>
            ))}
            <Box borderTop="1px solid" borderColor={D.line} />
          </Box>
        </Flex>
        <Box h={{ base: 16, md: 24 }} />
      </Container>
    </Box>
  );
}

/** How matching looks in the app. Labelled as a preview: no real people. */
function MatchIllustration() {
  const rows: Array<[string, string, boolean]> = [
    ["6 of 9", "#F07070", true],
    ["5 of 9", "#9C8CF0", false],
    ["5 of 9", "#F0A85A", false],
    ["5 of 9", "#7FD8A6", false],
  ];
  return (
    <Box
      w={{ base: "100%", lg: "540px" }}
      flexShrink={0}
      borderRadius="20px"
      bg={D.panel}
      border="1px solid"
      borderColor={D.line}
      overflow="hidden"
      boxShadow="0 30px 70px rgba(0,0,0,0.4)"
      aria-label="Preview of matching in the Nexzy app"
      role="img"
    >
      <Flex
        px={4}
        py={4}
        align="center"
        justify="space-between"
        bg="linear-gradient(90deg, rgba(255,210,74,0.12), transparent)"
      >
        <Box>
          <Text fontSize="sm" color={D.muted}>
            Your #GameDNA build
          </Text>
          <Text fontFamily="title" fontWeight="700" fontSize="2xl">
            Players who match you
          </Text>
        </Box>
        <Text
          px={2}
          py={1}
          borderRadius="6px"
          bg="rgba(59,107,255,0.25)"
          color={D.blueSoft}
          fontSize="xs"
          fontWeight="800"
        >
          In the app
        </Text>
      </Flex>
      {rows.map(([m, c, first], i) => (
        <Flex
          key={i}
          align="center"
          gap={3}
          px={4}
          py={3}
          borderTop="1px solid"
          borderColor={D.line}
        >
          <Box
            w="38px"
            h="38px"
            borderRadius="full"
            flexShrink={0}
            bg={`linear-gradient(135deg, ${c}, ${D.line})`}
          />
          <Box flex="1" minW={0}>
            <Box
              h="10px"
              w={`${[46, 38, 52, 42][i]}%`}
              borderRadius="5px"
              bg="rgba(255,255,255,0.22)"
            />
            <Flex gap={1} mt={2}>
              {[0, 1, 2].map((k) => (
                <Box
                  key={k}
                  w="20px"
                  h="26px"
                  borderRadius="3px"
                  bg="rgba(255,255,255,0.10)"
                />
              ))}
            </Flex>
          </Box>
          <Text
            fontFamily="title"
            fontWeight="700"
            fontSize="lg"
            color={D.yellow}
            w="58px"
            textAlign="right"
          >
            {m}
          </Text>
          <Text
            px={3}
            py={1.5}
            borderRadius="9px"
            fontSize="xs"
            fontWeight="800"
            bg={first ? "transparent" : D.blue}
            color={first ? D.dim : "white"}
            border={first ? `1.5px solid ${D.line}` : "none"}
          >
            {first ? "Following" : "Follow"}
          </Text>
        </Flex>
      ))}
      <Box px={4} py={3.5} borderTop="1px solid" borderColor={D.line}>
        <Flex
          h="46px"
          borderRadius="12px"
          bg={D.yellow}
          color={D.base}
          fontWeight="800"
          align="center"
          justify="center"
          fontSize="sm"
        >
          Start a Squad Room with your matches
        </Flex>
      </Box>
    </Box>
  );
}

/** A phone showing a build in the Nexzy feed. */
function PhoneFrame({ drop }: { drop: DropCard | null }) {
  return (
    <Box
      borderRadius="38px"
      bg="#05061A"
      p="10px"
      boxShadow={`0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${D.line}`}
      aria-hidden
    >
      <Box
        borderRadius="30px"
        bg={D.base}
        overflow="hidden"
        pt={10}
        pb={6}
        px={3}
      >
        <Flex align="center" gap={2} px={1}>
          <Box
            w="30px"
            h="30px"
            borderRadius="full"
            bg="linear-gradient(135deg,#F07070,#2C2463)"
          />
          <Box>
            <Box
              h="9px"
              w="70px"
              borderRadius="5px"
              bg="rgba(255,255,255,0.3)"
            />
            <Text fontSize="10px" color={D.muted} mt={1}>
              posted a build{drop ? ` in #${drop.hashtag}` : ""}
            </Text>
          </Box>
        </Flex>
        <Flex justify="center" mt={2.5}>
          <BuildCard
            hashtag={drop?.hashtag ?? "GameDNA"}
            line={drop?.title ?? "The 9 games that made you"}
            covers={drop?.covers ?? []}
            width={252}
          />
        </Flex>
        <Box
          mt={2.5}
          mx={1}
          px={3}
          py={2.5}
          borderRadius="12px"
          bg="rgba(255,210,74,0.12)"
          border="1px solid rgba(255,210,74,0.35)"
          fontSize="sm"
          fontWeight="700"
        >
          You match 6 of 9
        </Box>
      </Box>
    </Box>
  );
}
