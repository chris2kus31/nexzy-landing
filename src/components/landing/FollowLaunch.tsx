// ============================================
// FILE: components/landing/FollowLaunch.tsx
// Body of the /follow pre-launch hype page (Nexzy 1.1.10 rebrand).
// Sections: hero (countdown + notify-me + promo video), feature ticker,
// before/now, three pillars (phone screenshots when present), screenshot
// carousel, "bring your squad" share row, closing countdown.
// After LAUNCH_AT the countdowns become store buttons automatically.
// Screenshots come from /public/follow/shots (read at build in page.tsx):
//   pillar-1.*, pillar-2.*, pillar-3.*  -> the three pillar phones
//   store-*.*                           -> the carousel (sorted by name)
// ============================================
"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
  Stack,
  Flex,
  Badge,
  SimpleGrid,
  Icon,
} from "@chakra-ui/react";
import {
  FaApple,
  FaGooglePlay,
  FaGamepad,
  FaBookmark,
  FaBell,
  FaXTwitter,
  FaLink,
  FaShareNodes,
  FaCheck,
  FaXmark,
  FaUserGroup,
} from "react-icons/fa6";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { track, trackDownload } from "@/lib/analytics";
import {
  FOLLOW_URL,
  IOS_EVENT_PUBLISH_AT,
  IOS_EVENT_URL,
  isLive,
} from "@/lib/launch";
import Countdown from "@/components/launch/Countdown";
import EmailCapture from "@/components/landing/EmailCapture";

export type Shot = { src: string; alt: string };

const GRADIENT_TEXT = {
  background: "linear-gradient(90deg, #4DA3FF, #FFC400)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as const;

const TICKER = [
  "Follow any game",
  "One feed",
  "News, trailers, updates",
  "Game hubs",
  "Library in one tap",
  "Wishlist price alerts",
  "Post and tag the game",
  "Polls, GIFs, screenshots",
  "Your Gamer Card",
  "Gamers like you",
];

const PILLARS: {
  n: string;
  icon: ReactNode;
  title: string;
  body: string;
  chips: string[];
}[] = [
  {
    n: "01",
    icon: <FaGamepad />,
    title: "Follow your games",
    body: "Hit follow on any game. Its news, trailers, updates and guides find you, and every game has its own hub where players talk about it.",
    chips: ["News", "Trailers", "Updates", "Game hubs"],
  },
  {
    n: "02",
    icon: <FaBookmark />,
    title: "Library and wishlist, one tap",
    body: "Add what you're playing and what you've beaten in one tap. Wishlist the rest and get a price alert when they drop.",
    chips: ["One-tap add", "Wishlist", "Price alerts"],
  },
  {
    n: "03",
    icon: <FaUserGroup />,
    title: "Meet gamers like you",
    body: "Post screenshots, GIFs and polls, tag the game so the right players see it, and follow people who play what you play.",
    chips: ["Posts", "Polls", "GIFs", "Gamer Card"],
  },
];

const BEFORE = [
  "News buried under ads",
  "Help hidden in 10-minute videos",
  "Six tabs to keep up with one game",
];
const NOW = [
  "Follow a game once",
  "Everything about it lands in your feed",
  "Talk about it with players who get it",
];

/** Client-only launch state so the static page flips to "Out now" on Oct 21. */
function useLive(): [boolean, () => void] {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(isLive()), []);
  return [live, useCallback(() => setLive(true), [])];
}

function useEventPublished(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(Date.now() >= IOS_EVENT_PUBLISH_AT), []);
  return on;
}

function StoreButtons({ location }: { location: string }) {
  const btn = {
    size: "lg" as const,
    flex: 1,
    bg: "nexzy.gold",
    color: "nexzy.navy",
    borderRadius: "full",
    px: 7,
    fontWeight: "700",
    _hover: { bg: "nexzy.yellow", transform: "translateY(-2px)" },
    transition: "all 0.2s",
    boxShadow: "0 8px 22px rgba(255,201,71,0.28)",
  };
  return (
    <Stack
      direction={{ base: "column", sm: "row" }}
      gap={3}
      w={{ base: "full", sm: "auto" }}
    >
      <Button asChild {...btn}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("ios", location)}
        >
          <HStack gap={2}>
            <FaApple />
            <Text>App Store</Text>
          </HStack>
        </a>
      </Button>
      <Button asChild {...btn}>
        <a
          href={googlePlayUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("android", location)}
        >
          <HStack gap={2}>
            <FaGooglePlay />
            <Text>Google Play</Text>
          </HStack>
        </a>
      </Button>
    </Stack>
  );
}

/** Pre-launch: email notify + (from Oct 7) the App Store "Notify me" event. */
function NotifyBlock({
  source,
  align,
}: {
  source: string;
  align: "center" | "start";
}) {
  const eventOn = useEventPublished();
  return (
    <Stack gap={3} w="full" maxW="md" align={align}>
      <EmailCapture
        variant={align === "center" ? "cta" : "hero"}
        source={source}
        title="Get the heads-up the second it drops"
        buttonLabel="Notify me"
        successMessage="You're on the list. We'll ping you on Oct 21."
        footnote="Plus our weekly gaming news. Unsubscribe anytime."
        showPreferredSource={false}
      />
      {eventOn ? (
        <Button
          asChild
          size="md"
          variant="outline"
          borderRadius="full"
          borderColor="whiteAlpha.400"
          color="white"
          _hover={{ bg: "whiteAlpha.100" }}
        >
          <a
            href={IOS_EVENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("launch_event_click", { location: source })}
          >
            <HStack gap={2}>
              <FaBell />
              <Text>Notify me on the App Store</Text>
            </HStack>
          </a>
        </Button>
      ) : null}
    </Stack>
  );
}

function PhoneFrame({
  children,
  w,
}: {
  children: ReactNode;
  w: Record<string, string>;
}) {
  return (
    <Box
      w={w}
      aspectRatio={9 / 19.5}
      borderRadius="44px"
      overflow="hidden"
      border="6px solid"
      borderColor="whiteAlpha.200"
      bg="nexzy.navy"
      boxShadow="0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
      mx="auto"
    >
      {children}
    </Box>
  );
}

function PhoneVideo() {
  return (
    <Box position="relative">
      <Box
        position="absolute"
        inset="-12%"
        borderRadius="full"
        bg="radial-gradient(closest-side, rgba(77,163,255,0.35), transparent)"
        filter="blur(30px)"
        aria-hidden
      />
      <Box position="relative">
        <PhoneFrame w={{ base: "250px", md: "300px" }}>
          <video
            src="/follow/nexzy-promo.mp4"
            poster="/follow/nexzy-promo-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Nexzy app preview: following a game, posting, and meeting gamers"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </PhoneFrame>
      </Box>
    </Box>
  );
}

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <Box
      bg="nexzy.gold"
      color="nexzy.navy"
      py={3}
      overflow="hidden"
      transform="rotate(-1.2deg)"
      mx="-2%"
      boxShadow="0 10px 30px rgba(255,201,71,0.25)"
      aria-hidden
    >
      <Flex className="nexzy-marquee" w="max-content">
        {items.map((t, i) => (
          <HStack key={i} gap={8} pr={8} flexShrink={0}>
            <Text
              fontFamily="title"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.08em"
              fontSize={{ base: "sm", md: "md" }}
              whiteSpace="nowrap"
            >
              {t}
            </Text>
            <Icon boxSize={3}>
              <BsFillLightningChargeFill />
            </Icon>
          </HStack>
        ))}
      </Flex>
    </Box>
  );
}

function BeforeNow() {
  return (
    <Box as="section" py={{ base: 16, md: 24 }} bg="nexzy.navy">
      <Container maxW="container.lg" px={{ base: 5, md: 6 }}>
        <Heading
          as="h2"
          fontFamily="title"
          size={{ base: "2xl", md: "3xl" }}
          color="white"
          textAlign="center"
          mb={{ base: 10, md: 14 }}
          lineHeight="1.15"
        >
          Keeping up with your games
          <br />
          <Box as="span" style={GRADIENT_TEXT}>
            shouldn&apos;t be a side quest.
          </Box>
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 4, md: 6 }}>
          <Box
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.100"
          >
            <Text
              textTransform="uppercase"
              letterSpacing="0.16em"
              fontSize="xs"
              fontWeight="700"
              color="gray.400"
              mb={5}
            >
              Before
            </Text>
            <Stack gap={4}>
              {BEFORE.map((b) => (
                <HStack key={b} gap={3} align="start">
                  <Flex
                    mt="2px"
                    w={6}
                    h={6}
                    flexShrink={0}
                    align="center"
                    justify="center"
                    borderRadius="full"
                    bg="whiteAlpha.100"
                    color="gray.400"
                  >
                    <Icon boxSize={3}>
                      <FaXmark />
                    </Icon>
                  </Flex>
                  <Text color="gray.400" fontSize={{ base: "md", md: "lg" }}>
                    {b}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Box>
          <Box
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            bg="linear-gradient(160deg, rgba(77,163,255,0.16), rgba(255,196,0,0.10))"
            border="1px solid"
            borderColor="nexzy.yellow/30"
            boxShadow="0 20px 60px rgba(0,0,0,0.35)"
          >
            <Text
              textTransform="uppercase"
              letterSpacing="0.16em"
              fontSize="xs"
              fontWeight="700"
              color="nexzy.gold"
              mb={5}
            >
              The new Nexzy
            </Text>
            <Stack gap={4}>
              {NOW.map((b) => (
                <HStack key={b} gap={3} align="start">
                  <Flex
                    mt="2px"
                    w={6}
                    h={6}
                    flexShrink={0}
                    align="center"
                    justify="center"
                    borderRadius="full"
                    bg="nexzy.gold"
                    color="nexzy.navy"
                  >
                    <Icon boxSize={3}>
                      <FaCheck />
                    </Icon>
                  </Flex>
                  <Text
                    color="white"
                    fontWeight="600"
                    fontSize={{ base: "md", md: "lg" }}
                  >
                    {b}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function Pillars({ pillarShots }: { pillarShots: (string | null)[] }) {
  return (
    <Box as="section" py={{ base: 8, md: 12 }} bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Stack gap={{ base: 16, md: 24 }}>
          {PILLARS.map((p, i) => {
            const shot = pillarShots[i];
            const flip = i % 2 === 1;
            return (
              <Flex
                key={p.n}
                direction={{ base: "column", md: flip ? "row-reverse" : "row" }}
                align="center"
                gap={{ base: 10, md: 16 }}
              >
                <Stack
                  flex={1}
                  gap={5}
                  textAlign={{ base: "center", md: "left" }}
                  align={{ base: "center", md: "start" }}
                >
                  <Text
                    fontFamily="title"
                    fontWeight="700"
                    fontSize={{ base: "5xl", md: "6xl" }}
                    lineHeight="1"
                    style={GRADIENT_TEXT}
                  >
                    {p.n}
                  </Text>
                  <Heading
                    as="h3"
                    fontFamily="title"
                    size={{ base: "2xl", md: "3xl" }}
                    color="white"
                    lineHeight="1.1"
                  >
                    {p.title}
                  </Heading>
                  <Text
                    color="nexzy.gray.100"
                    fontSize={{ base: "md", md: "lg" }}
                    lineHeight="1.7"
                    maxW="lg"
                  >
                    {p.body}
                  </Text>
                  <HStack
                    gap={2}
                    flexWrap="wrap"
                    justify={{ base: "center", md: "start" }}
                  >
                    {p.chips.map((c) => (
                      <Box
                        key={c}
                        px={3.5}
                        py={1.5}
                        borderRadius="full"
                        bg="whiteAlpha.100"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        fontSize="sm"
                        fontWeight="600"
                        color="white"
                      >
                        {c}
                      </Box>
                    ))}
                  </HStack>
                </Stack>
                <Box flex={1} w="full">
                  {shot ? (
                    <PhoneFrame w={{ base: "230px", md: "270px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot}
                        alt={p.title}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </PhoneFrame>
                  ) : (
                    <Flex
                      mx="auto"
                      w={{ base: "200px", md: "240px" }}
                      aspectRatio={1}
                      align="center"
                      justify="center"
                      borderRadius="3xl"
                      bg="linear-gradient(160deg, rgba(77,163,255,0.18), rgba(255,196,0,0.12))"
                      border="1px solid"
                      borderColor="nexzy.yellow/25"
                      color="nexzy.gold"
                    >
                      <Icon boxSize={20}>{p.icon}</Icon>
                    </Flex>
                  )}
                </Box>
              </Flex>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}

function Carousel({ shots }: { shots: Shot[] }) {
  if (!shots.length) return null;
  return (
    <Box as="section" py={{ base: 16, md: 24 }} bg="nexzy.navy">
      <Container maxW="container.xl" px={{ base: 5, md: 6 }}>
        <Heading
          as="h2"
          fontFamily="title"
          size={{ base: "2xl", md: "3xl" }}
          color="white"
          textAlign="center"
          mb={{ base: 8, md: 12 }}
        >
          Take a look.
        </Heading>
        <Flex
          gap={5}
          overflowX="auto"
          pb={4}
          justify={{ base: "start", xl: "center" }}
          style={{ scrollSnapType: "x mandatory" }}
        >
          {shots.map((s) => (
            <Box
              key={s.src}
              flex="0 0 auto"
              w={{ base: "210px", md: "240px" }}
              borderRadius="2xl"
              overflow="hidden"
              border="1px solid"
              borderColor="whiteAlpha.200"
              boxShadow="0 16px 40px rgba(0,0,0,0.4)"
              style={{ scrollSnapAlign: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                loading="lazy"
                style={{ width: "100%", display: "block" }}
              />
            </Box>
          ))}
        </Flex>
      </Container>
    </Box>
  );
}

function ShareRow() {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);
  const text =
    "The new Nexzy drops Oct 21: follow the games you love and the gamers who get them.";
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(FOLLOW_URL)}`;

  const share = async () => {
    track("launch_share_click", { method: "native" });
    try {
      await navigator.share({ title: "The new Nexzy", text, url: FOLLOW_URL });
    } catch {
      // user cancelled
    }
  };
  const copy = async () => {
    track("launch_share_click", { method: "copy" });
    try {
      await navigator.clipboard.writeText(FOLLOW_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  };

  const pill = {
    size: "md" as const,
    borderRadius: "full",
    bg: "whiteAlpha.100",
    color: "white",
    border: "1px solid",
    borderColor: "whiteAlpha.200",
    _hover: { bg: "whiteAlpha.200" },
  };

  return (
    <Box as="section" py={{ base: 12, md: 16 }} bg="nexzy.navy">
      <Container maxW="container.md" px={{ base: 5, md: 6 }}>
        <Stack align="center" gap={5} textAlign="center">
          <Heading
            as="h2"
            fontFamily="title"
            size={{ base: "xl", md: "2xl" }}
            color="white"
          >
            Bring your squad.
          </Heading>
          <Text color="nexzy.gray.100">
            Nexzy is better with the people you already play with.
          </Text>
          <HStack gap={3} flexWrap="wrap" justify="center">
            {canShare ? (
              <Button {...pill} onClick={share}>
                <FaShareNodes />
                Share
              </Button>
            ) : null}
            <Button asChild {...pill}>
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("launch_share_click", { method: "x" })}
              >
                <FaXTwitter />
                Post on X
              </a>
            </Button>
            <Button {...pill} onClick={copy}>
              {copied ? <FaCheck /> : <FaLink />}
              {copied ? "Link copied" : "Copy link"}
            </Button>
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
}

export default function FollowLaunch({
  shots,
  pillarShots,
}: {
  shots: Shot[];
  pillarShots: (string | null)[];
}) {
  const [live, goLive] = useLive();

  return (
    <>
      {/* Hero */}
      <Box
        as="section"
        pt={{ base: 24, md: 32 }}
        pb={{ base: 16, md: 24 }}
        bg="nexzy.navy"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="-20%"
          right="-10%"
          width="45%"
          height="120%"
          borderRadius="full"
          bg="nexzy.blue"
          opacity={0.12}
          filter="blur(100px)"
        />
        <Box
          position="absolute"
          bottom="-30%"
          left="-10%"
          width="40%"
          height="100%"
          borderRadius="full"
          bg="nexzy.yellow"
          opacity={0.09}
          filter="blur(100px)"
        />
        <Container
          maxW="container.xl"
          position="relative"
          px={{ base: 5, md: 6 }}
        >
          <Flex
            direction={{ base: "column", lg: "row" }}
            align="center"
            gap={{ base: 12, lg: 16 }}
          >
            <Stack
              flex={1}
              align={{ base: "center", lg: "start" }}
              textAlign={{ base: "center", lg: "left" }}
              gap={6}
            >
              <Badge
                bg="nexzy.yellow/15"
                color="nexzy.gold"
                px={4}
                py={2}
                borderRadius="full"
                border="1px solid"
                borderColor="nexzy.yellow/30"
                display="flex"
                alignItems="center"
                gap={2}
                textTransform="uppercase"
                letterSpacing="0.12em"
                fontWeight="700"
              >
                <BsFillLightningChargeFill />
                <Text>{live ? "Out now" : "The new Nexzy drops Oct 21"}</Text>
              </Badge>

              <Heading
                as="h1"
                fontFamily="title"
                size={{ base: "3xl", md: "4xl", lg: "5xl" }}
                fontWeight="bold"
                lineHeight="1.05"
                color="nexzy.white"
              >
                Follow the games you love.
                <br />
                <Box as="span" style={GRADIENT_TEXT}>
                  And the gamers who get them.
                </Box>
              </Heading>

              <Text
                fontSize={{ base: "lg", md: "xl" }}
                color="nexzy.gray.100"
                maxW="xl"
              >
                One feed for every game you follow. Its news, trailers and
                updates come to you, and so do the players who love it as much
                as you do.
              </Text>

              {live ? (
                <StoreButtons location="follow_hero" />
              ) : (
                <>
                  <Countdown onLive={goLive} />
                  <NotifyBlock source="follow_hero" align={"start"} />
                  <Text fontSize="sm" color="nexzy.gray.100">
                    Already on Nexzy? It updates automatically on Oct 21.
                  </Text>
                </>
              )}
            </Stack>

            <Box flex={{ lg: 1 }}>
              <PhoneVideo />
            </Box>
          </Flex>
        </Container>
      </Box>

      <Box bg="nexzy.navy" py={6} overflow="hidden">
        <Ticker />
      </Box>

      <BeforeNow />
      <Pillars pillarShots={pillarShots} />
      <Carousel shots={shots} />
      <ShareRow />

      {/* Closing */}
      <Box
        as="section"
        py={{ base: 16, md: 24 }}
        bg="nexzy.navy"
        borderTop="1px solid"
        borderColor="nexzy.blue/20"
      >
        <Container maxW="container.md" px={{ base: 5, md: 6 }}>
          <Stack gap={6} align="center" textAlign="center">
            <Heading
              as="h2"
              fontFamily="title"
              size={{ base: "2xl", md: "3xl" }}
              color="white"
            >
              {live ? "It's here." : "Oct 21. Be there day one."}
            </Heading>
            {live ? (
              <StoreButtons location="follow_cta" />
            ) : (
              <>
                <Countdown onLive={goLive} />
                <NotifyBlock source="follow_cta" align="center" />
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
