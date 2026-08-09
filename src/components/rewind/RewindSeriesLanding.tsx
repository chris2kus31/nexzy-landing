import type { ReactNode } from "react";
import { Box, Container, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { VT323 } from "next/font/google";
import {
  FiCalendar,
  FiClock,
  FiMessageSquare,
  FiPlay,
  FiHeart,
  FiBookOpen,
  FiDownload,
  FiArrowRight,
} from "react-icons/fi";
import { FaGamepad, FaApple, FaGooglePlay } from "react-icons/fa";
import TrackedLink from "@/components/TrackedLink";
import ShareRewind from "@/components/rewind/ShareRewind";
import type { RewindDayHub, RewindRecentItem } from "@/lib/blog/api";
import { monthName } from "@/lib/rewind/era";

// ── Assets / links you can swap in ────────────────────────────────────────────
const HERO_IMG = "/rewind/hero-rewinding.png"; // drop the CRT hero graphic here
const TRAILER_URL = ""; // set a URL to show the Watch Trailer button
const APP_STORE_URL = "#"; // real App Store link
const PLAY_STORE_URL = "#"; // real Google Play link
const QR_IMG = "/qr-get-app.png";
const PHONE_A = "/NexzyHomeLogin.png";
const PHONE_B = "/NexzyAI.png";

const vt = VT323({ weight: "400", subsets: ["latin"], display: "swap" });
const DIGITAL = vt.style.fontFamily; // digital-clock readout

const GOLD = "#f5b53d";
const BLUE = "#4EA1FF";
const NAVY = "#1a1f3a";

/** Era accent for a year — used on the year badges. */
function eraColor(year: number | null): string {
  if (!year) return BLUE;
  if (year < 1990) return "#B06CF0"; // 70s–80s purple
  if (year < 2000) return BLUE; // 90s blue
  if (year < 2010) return GOLD; // 2000s gold
  return "#E86A3A"; // 2010s+ orange
}
function eraCount(hub: RewindDayHub): number {
  const set = new Set(
    hub.episodes.map((e) => {
      const y = e.event?.year ?? 0;
      return y < 1990 ? "80" : y < 2000 ? "90" : y < 2010 ? "00" : "10";
    }),
  );
  return set.size;
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      bg="rgba(10,18,34,.5)"
      p={{ base: 5, md: 7 }}
      mb={{ base: 6, md: 8 }}
    >
      {children}
    </Box>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Flex align="center" gap={3} mb={{ base: 5, md: 6 }}>
      <Text
        fontFamily="mono"
        fontWeight="800"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="nexzy.white"
        fontSize={{ base: "md", md: "lg" }}
      >
        {children}
      </Text>
      <Box flex="1" h="1px" bg="whiteAlpha.200" />
    </Flex>
  );
}

function IconBadge({ icon, color }: { icon: ReactNode; color: string }) {
  return (
    <Flex
      w="52px"
      h="52px"
      align="center"
      justify="center"
      borderRadius="lg"
      border="1px solid"
      borderColor={color}
      color={color}
      fontSize="22px"
      css={{ boxShadow: `0 0 16px ${color}33` }}
    >
      {icon}
    </Flex>
  );
}

export default function RewindSeriesLanding({
  todayHub,
  recent,
}: {
  todayHub: RewindDayHub | null;
  recent: RewindRecentItem[];
}) {
  const now = new Date();
  const episodes = todayHub?.episodes ?? [];
  const hero = episodes[0] ?? null;
  const heroYear = hero?.event?.year ?? null;

  return (
    <Container maxW="7xl" pt={{ base: 24, md: 28 }} pb={{ base: 12, md: 16 }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <Flex
        direction={{ base: "column", lg: "row" }}
        gap={{ base: 8, lg: 10 }}
        align="center"
        mb={{ base: 8, md: 10 }}
      >
        <Box flex="1">
          <Text
            fontFamily="mono"
            fontSize="12px"
            letterSpacing="0.22em"
            color={GOLD}
            mb={3}
          >
            /// NEXZY ORIGINAL SERIES ///
          </Text>
          <Flex align="center" gap={3}>
            <Box color={GOLD} fontSize={{ base: "34px", md: "46px" }}>
              ◀◀
            </Box>
            <Heading
              color="#EAF0F9"
              fontStyle="italic"
              textTransform="uppercase"
              fontFamily="title"
              fontSize={{ base: "44px", md: "72px" }}
              lineHeight="0.95"
              css={{ textShadow: "0 3px 3px rgba(0,0,0,.6)" }}
            >
              Rewinding
            </Heading>
          </Flex>
          <Text
            mt={1}
            color={GOLD}
            fontWeight="800"
            letterSpacing="0.16em"
            textTransform="uppercase"
            fontSize={{ base: "md", md: "xl" }}
          >
            Today in Gaming History
          </Text>

          <Text mt={6} color="nexzy.gray.100" maxW="34rem" lineHeight="1.7">
            Every day we rewind the clock to the moments, games, and headlines
            that shaped the industry we love today.
          </Text>
          <Text mt={4} color="nexzy.white" fontWeight="600">
            Different day. Different era.{" "}
            <Box as="span" color={GOLD}>
              Always worth remembering.
            </Box>
          </Text>

          <Flex align="center" gap={5} mt={7} flexWrap="wrap">
            {TRAILER_URL ? (
              <TrackedLink
                href={TRAILER_URL}
                event="content_click"
                params={{ content_type: "rewind", from: "series_trailer" }}
              >
                <Flex
                  align="center"
                  gap={2}
                  px={5}
                  py={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={GOLD}
                  color={GOLD}
                  fontWeight="800"
                  letterSpacing="0.08em"
                  _hover={{ bg: "rgba(245,181,61,.1)" }}
                >
                  <FiPlay /> WATCH TRAILER
                </Flex>
              </TrackedLink>
            ) : null}
            <ShareRewind />
          </Flex>
        </Box>

        {/* Hero graphic — sits on a matching dark radial backdrop and its edges
            fade out, so it melts into the page instead of a flat box. */}
        <Box
          flex="1.15"
          w="100%"
          position="relative"
          css={{
            background: `radial-gradient(120% 120% at 60% 42%, #0a1120 0%, #10162a 52%, ${NAVY} 100%)`,
          }}
        >
          <Image
            src={HERO_IMG}
            alt="Rewinding — a retro console and CRT lit up in neon"
            w="100%"
            h="auto"
            css={{
              maskImage:
                "radial-gradient(closest-side at 56% 48%, #000 68%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(closest-side at 56% 48%, #000 68%, transparent 100%)",
            }}
          />
        </Box>
      </Flex>

      {/* ── HOW REWINDING WORKS ──────────────────────────────── */}
      <Panel>
        <SectionTitle>How Rewinding Works</SectionTitle>
        <Flex
          align="flex-start"
          gap={{ base: 6, md: 4 }}
          direction={{ base: "column", md: "row" }}
        >
          {[
            {
              icon: <FiCalendar />,
              c: BLUE,
              t: "1. We pick the day",
              d: "We travel back to today's date in gaming history.",
            },
            {
              icon: <FiClock />,
              c: "#B06CF0",
              t: "2. We rewind time",
              d: "From today to decades past, unlocking unforgettable moments.",
            },
            {
              icon: <FaGamepad />,
              c: GOLD,
              t: "3. We bring it to life",
              d: "Games, news, and events that mattered then — and still hit now.",
            },
            {
              icon: <FiMessageSquare />,
              c: "#E86A3A",
              t: "4. You join the convo",
              d: "Relive it, share it, and keep the memories alive.",
            },
          ].map((s, i, arr) => (
            <Flex key={s.t} align="stretch" flex="1" gap={4}>
              <Box>
                <IconBadge icon={s.icon} color={s.c} />
                <Text color="nexzy.white" fontWeight="700" mt={3}>
                  {s.t}
                </Text>
                <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
                  {s.d}
                </Text>
              </Box>
              {i < arr.length - 1 && (
                <Box
                  color="whiteAlpha.400"
                  alignSelf="center"
                  display={{ base: "none", md: "block" }}
                >
                  <FiArrowRight />
                </Box>
              )}
            </Flex>
          ))}
        </Flex>
      </Panel>

      {/* ── TODAY'S REWIND ───────────────────────────────────── */}
      {episodes.length > 0 && (
        <Panel>
          <SectionTitle>Today&apos;s Rewind</SectionTitle>
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={{ base: 6, lg: 8 }}
          >
            {/* left readout */}
            <Box
              minW={{ lg: "240px" }}
              textAlign={{ base: "center", lg: "left" }}
            >
              <Text
                color={BLUE}
                letterSpacing="0.12em"
                fontSize={{ base: "20px", md: "24px" }}
                css={{ fontFamily: DIGITAL }}
              >
                {monthName(now.getMonth() + 1).toUpperCase()} {now.getDate()}
                {heroYear ? `, ${heroYear}` : ""}
              </Text>
              <Text
                color={GOLD}
                fontSize={{ base: "72px", md: "92px" }}
                lineHeight="0.9"
                letterSpacing="0.04em"
                css={{
                  fontFamily: DIGITAL,
                  textShadow: "0 0 26px rgba(245,181,61,.4)",
                }}
              >
                {heroYear ?? "—"}
              </Text>
              <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
                {episodes.length} moment{episodes.length === 1 ? "" : "s"} ·{" "}
                {todayHub ? eraCount(todayHub) : 1} era
                {todayHub && eraCount(todayHub) === 1 ? "" : "s"} · one day
              </Text>
              <TrackedLink
                href={`/rewind/on-this-day/${monthName(now.getMonth() + 1).toLowerCase()}-${now.getDate()}`}
                event="content_click"
                params={{ content_type: "rewind", from: "series_explore" }}
              >
                <Flex
                  align="center"
                  justify="center"
                  gap={2}
                  bg={GOLD}
                  color="#0d1526"
                  fontWeight="800"
                  borderRadius="lg"
                  px={4}
                  py={3}
                  display="inline-flex"
                >
                  Explore today&apos;s Rewind <FiArrowRight />
                </Flex>
              </TrackedLink>
            </Box>

            {/* moment cards */}
            <Flex
              gap={4}
              flex="1"
              overflowX="auto"
              pb={2}
              justify={{ base: "flex-start", lg: "flex-start" }}
              css={{ scrollSnapType: "x mandatory" }}
            >
              {episodes.slice(0, 8).map((ep) => {
                const y = ep.event?.year ?? null;
                const c = eraColor(y);
                return (
                  <Box
                    key={ep.slug}
                    w={{ base: "150px", md: "160px" }}
                    flexShrink={0}
                    css={{ scrollSnapAlign: "start" }}
                  >
                    <Box position="relative" mb={3}>
                      {y && (
                        <Box
                          position="absolute"
                          top="-8px"
                          left="10px"
                          zIndex={1}
                          bg={c}
                          color="#0d1526"
                          fontFamily="mono"
                          fontWeight="800"
                          fontSize="12px"
                          px={2}
                          py="2px"
                          borderRadius="sm"
                        >
                          {y}
                        </Box>
                      )}
                      <Box
                        borderRadius="lg"
                        overflow="hidden"
                        border="1px solid"
                        borderColor={c}
                        bg="#0b1526"
                        css={{ aspectRatio: "0.78" }}
                      >
                        {ep.heroImageUrl && (
                          <Image
                            src={ep.heroImageUrl}
                            alt={ep.title}
                            w="100%"
                            h="100%"
                            objectFit="cover"
                          />
                        )}
                      </Box>
                    </Box>
                    <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
                      {ep.title}
                    </Text>
                    {ep.excerpt && (
                      <Text color="nexzy.gray.100" fontSize="sm" lineClamp={2}>
                        {ep.excerpt}
                      </Text>
                    )}
                    <TrackedLink
                      href={`/rewind/${ep.slug}`}
                      event="content_click"
                      params={{
                        content_type: "rewind",
                        slug: ep.slug,
                        from: "series_moment",
                      }}
                    >
                      <Text color={c} fontWeight="700" fontSize="sm" mt={1}>
                        Rewind to {y ?? "then"} →
                      </Text>
                    </TrackedLink>
                  </Box>
                );
              })}
            </Flex>
          </Flex>
        </Panel>
      )}

      {/* ── WHY IT MATTERS ───────────────────────────────────── */}
      <Panel>
        <SectionTitle>Why It Matters</SectionTitle>
        <Flex
          gap={{ base: 6, md: 4 }}
          direction={{ base: "column", sm: "row" }}
          flexWrap="wrap"
        >
          {[
            {
              icon: <FaGamepad />,
              c: BLUE,
              t: "Nostalgia",
              d: "Relive the games and moments that made you a gamer.",
            },
            {
              icon: <FiBookOpen />,
              c: "#B06CF0",
              t: "History",
              d: "Discover the events that shaped the industry we play in.",
            },
            {
              icon: <FiHeart />,
              c: "#E86A3A",
              t: "Community",
              d: "Share your memories and see the stories from other gamers.",
            },
            {
              icon: <FiDownload />,
              c: "#39C07A",
              t: "New Players",
              d: "Learn the roots. Understand the legacy. Play forward.",
            },
          ].map((s) => (
            <Flex key={s.t} gap={3} flex="1" minW="220px" align="flex-start">
              <IconBadge icon={s.icon} color={s.c} />
              <Box>
                <Text
                  color={s.c}
                  fontWeight="800"
                  textTransform="uppercase"
                  fontSize="sm"
                  letterSpacing="0.06em"
                >
                  {s.t}
                </Text>
                <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
                  {s.d}
                </Text>
              </Box>
            </Flex>
          ))}
        </Flex>
      </Panel>

      {/* ── PAST REWINDS ─────────────────────────────────────── */}
      {recent.length > 0 && (
        <Panel>
          <SectionTitle>Past Rewinds</SectionTitle>
          <Flex
            gap={4}
            overflowX="auto"
            pb={2}
            css={{ scrollSnapType: "x mandatory" }}
          >
            {recent.map((r) => (
              <TrackedLink
                key={r.slug}
                href={`/rewind/${r.slug}`}
                event="content_click"
                params={{
                  content_type: "rewind",
                  slug: r.slug,
                  from: "series_past",
                }}
              >
                <Box
                  minW={{ base: "220px", md: "240px" }}
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  overflow="hidden"
                  css={{ scrollSnapAlign: "start" }}
                  _hover={{ borderColor: "nexzy.gold" }}
                >
                  <Flex>
                    <Box p={3} minW="72px">
                      <Text
                        fontFamily="mono"
                        fontSize="10px"
                        color="nexzy.gray.100"
                        textTransform="uppercase"
                      >
                        {r.month ? monthName(r.month) : ""} {r.day ?? ""}
                      </Text>
                      <Text
                        fontFamily="mono"
                        fontWeight="900"
                        color="nexzy.gold"
                        fontSize="xl"
                      >
                        {r.year ?? "—"}
                      </Text>
                    </Box>
                    <Box
                      flex="1"
                      bg="#0b1526"
                      css={{ aspectRatio: "1.4" }}
                      position="relative"
                    >
                      {r.image && (
                        <Image
                          src={r.image}
                          alt={r.title}
                          w="100%"
                          h="100%"
                          objectFit="cover"
                        />
                      )}
                    </Box>
                  </Flex>
                  <Box p={3}>
                    <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
                      {r.title}
                    </Text>
                    {r.excerpt && (
                      <Text color="nexzy.gray.100" fontSize="xs" lineClamp={2}>
                        {r.excerpt}
                      </Text>
                    )}
                  </Box>
                </Box>
              </TrackedLink>
            ))}
          </Flex>
        </Panel>
      )}

      {/* ── APP CTA ──────────────────────────────────────────── */}
      <Panel>
        <Flex
          direction={{ base: "column", md: "row" }}
          align="center"
          gap={{ base: 6, md: 8 }}
        >
          <Flex gap={2} flexShrink={0}>
            <Image
              src={PHONE_A}
              alt="Nexzy app"
              w={{ base: "84px", md: "104px" }}
              borderRadius="xl"
              border="1px solid"
              borderColor="whiteAlpha.200"
            />
            <Image
              src={PHONE_B}
              alt="Nexzy app"
              w={{ base: "84px", md: "104px" }}
              borderRadius="xl"
              border="1px solid"
              borderColor="whiteAlpha.200"
              mt={6}
            />
          </Flex>
          <Box flex="1">
            <Heading
              fontFamily="title"
              fontStyle="italic"
              color="nexzy.white"
              fontSize={{ base: "2xl", md: "3xl" }}
            >
              Take the past with you
            </Heading>
            <Text color="nexzy.gray.100" mt={2}>
              Get Rewinding and all of Nexzy in your pocket. Never miss a day in
              gaming history.
            </Text>
          </Box>
          <Flex align="center" gap={4} flexShrink={0}>
            <Image
              src={QR_IMG}
              alt="Scan to get the app"
              w="96px"
              h="96px"
              borderRadius="md"
              bg="white"
              p={1}
            />
            <Flex direction="column" gap={2}>
              <TrackedLink
                href={APP_STORE_URL}
                event="content_click"
                params={{ content_type: "app", from: "rewind_series" }}
              >
                <Flex
                  align="center"
                  gap={2}
                  bg="#000"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  borderRadius="md"
                  px={4}
                  py={2}
                  color="white"
                  minW="150px"
                >
                  <FaApple size={22} />
                  <Box lineHeight="1.1">
                    <Text fontSize="9px">Download on the</Text>
                    <Text fontWeight="700">App Store</Text>
                  </Box>
                </Flex>
              </TrackedLink>
              <TrackedLink
                href={PLAY_STORE_URL}
                event="content_click"
                params={{ content_type: "app", from: "rewind_series" }}
              >
                <Flex
                  align="center"
                  gap={2}
                  bg="#000"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  borderRadius="md"
                  px={4}
                  py={2}
                  color="white"
                  minW="150px"
                >
                  <FaGooglePlay size={20} />
                  <Box lineHeight="1.1">
                    <Text fontSize="9px">Get it on</Text>
                    <Text fontWeight="700">Google Play</Text>
                  </Box>
                </Flex>
              </TrackedLink>
            </Flex>
          </Flex>
        </Flex>
      </Panel>
    </Container>
  );
}
