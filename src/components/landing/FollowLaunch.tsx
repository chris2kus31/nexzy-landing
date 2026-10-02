// ============================================
// FILE: components/landing/FollowLaunch.tsx
// Body of the /follow pre-launch page (Nexzy 1.1.10, "Follow the games you
// love"). Written for someone who has never heard of Nexzy, in this order:
//   1. Hero: what Nexzy is (plain words) + the real feed on a phone
//   2. How it works: 3 steps, each next to the real screen
//   3. Why we built it: before / the new Nexzy
//   4. See it in action: the promo video
//   5. More of the app: screenshot carousel
//   6. Bring your squad (share) + closing launch CTA
// Launch block: countdown + "Notify me" until LAUNCH_AT, then store buttons.
// Screenshots come from /public/follow/shots (read at build in page.tsx) and
// are picked by name: pillar-1 (feed), pillar-2 (library), pillar-3 (post),
// store-1 (game page), store-2 (wishlist), store-3 (gamer card),
// store-4 (new post), store-5 (activity).
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
  SimpleGrid,
  Icon,
  Link,
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
  FaNewspaper,
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

type Shots = Record<string, string>;

const GRADIENT_TEXT = {
  background: "linear-gradient(90deg, #4DA3FF, #FFC400)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as const;

const SECTION_PY = { base: 14, md: 20 };

const STEPS: {
  shot: string;
  icon: ReactNode;
  title: string;
  body: string;
  chips: string[];
}[] = [
  {
    shot: "store-1",
    icon: <FaGamepad />,
    title: "Follow any game",
    body: "Search a game and tap Follow. From the same page you can add it to your library or wishlist, and every game has its own hub where players post about it.",
    chips: ["Follow", "Game hubs", "News and guides"],
  },
  {
    shot: "pillar-2",
    icon: <FaBookmark />,
    title: "Keep your library and wishlist",
    body: "Add what you're playing and what you've beaten in one tap. Wishlist the games you want and track their prices so you know when they drop.",
    chips: ["One-tap add", "Playing / Completed", "Price tracking"],
  },
  {
    shot: "pillar-3",
    icon: <FaUserGroup />,
    title: "Meet gamers who play what you play",
    body: "Post screenshots, GIFs and polls, tag the game so the right players see it, reply, and follow people who share your taste.",
    chips: ["Posts", "Replies", "Polls and GIFs"],
  },
];

const CAROUSEL: { shot: string; label: string; alt: string }[] = [
  {
    shot: "store-2",
    label: "Wishlist",
    alt: "Nexzy wishlist with price tracking for each game",
  },
  {
    shot: "store-3",
    label: "Gamer Card",
    alt: "A Nexzy Gamer Card profile with library, wishlist and followed games",
  },
  {
    shot: "store-4",
    label: "New post",
    alt: "Writing a new post in Nexzy with a game tagged",
  },
  {
    shot: "store-5",
    label: "Activity",
    alt: "Nexzy Activity with likes, replies and new followers",
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
    <Stack direction={{ base: "column", sm: "row" }} gap={3}>
      <Button asChild {...btn}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("ios", location)}
        >
          <FaApple /> App Store
        </a>
      </Button>
      <Button asChild {...btn}>
        <a
          href={googlePlayUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("android", location)}
        >
          <FaGooglePlay /> Google Play
        </a>
      </Button>
    </Stack>
  );
}

/** Small inline store links for "want it now?" lines. */
function InlineStoreLinks({ location }: { location: string }) {
  return (
    <>
      <Link
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        color="nexzy.gold"
        fontWeight="600"
        onClick={() => trackDownload("ios", location)}
      >
        App Store
      </Link>{" "}
      or{" "}
      <Link
        href={googlePlayUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        color="nexzy.gold"
        fontWeight="600"
        onClick={() => trackDownload("android", location)}
      >
        Google Play
      </Link>
    </>
  );
}

/** The launch card: countdown + notify (pre-launch) or store buttons (live). */
function LaunchCard({
  source,
  live,
  onLive,
  big = false,
}: {
  source: string;
  live: boolean;
  onLive: () => void;
  big?: boolean;
}) {
  const eventOn = useEventPublished();
  if (live) {
    return (
      <Stack gap={3} align={big ? "center" : "start"}>
        <StoreButtons location={source} />
      </Stack>
    );
  }
  return (
    <Box
      w="full"
      maxW={big ? "lg" : "md"}
      mx={big ? "auto" : undefined}
      p={{ base: 5, md: 6 }}
      borderRadius="2xl"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.yellow/25"
      textAlign={big ? "center" : "left"}
    >
      <Stack gap={4} align={big ? "center" : "stretch"}>
        {big ? (
          <Countdown onLive={onLive} />
        ) : (
          <HStack gap={2} flexWrap="wrap">
            <Text
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.12em"
              color="nexzy.gold"
            >
              New version drops Oct 21
            </Text>
            <Text fontSize="xs" color="whiteAlpha.500">
              /
            </Text>
            <Countdown size="sm" onLive={onLive} />
          </HStack>
        )}
        <EmailCapture
          variant={big ? "cta" : "hero"}
          source={source}
          title=""
          buttonLabel="Notify me"
          successMessage="You're on the list. We'll email you on Oct 21."
          footnote="We'll email you on launch day, plus our weekly gaming news. Unsubscribe anytime."
          showPreferredSource={false}
        />
        {eventOn ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            color="white"
            alignSelf={big ? "center" : "start"}
            px={0}
            _hover={{ bg: "transparent", color: "nexzy.gold" }}
          >
            <a
              href={IOS_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("launch_event_click", { location: source })}
            >
              <FaBell /> On iPhone? Tap Notify me on the App Store
            </a>
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

function PhoneShot({
  src,
  alt,
  w,
  eager = false,
}: {
  src: string;
  alt: string;
  w: Record<string, string>;
  eager?: boolean;
}) {
  return (
    <Box
      w={w}
      aspectRatio={860 / 1864}
      borderRadius={{ base: "32px", md: "40px" }}
      overflow="hidden"
      border="5px solid"
      borderColor="#2A3157"
      bg="#1A1F3A"
      boxShadow="0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
      flexShrink={0}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Box>
  );
}

function HeroPhones({ shots }: { shots: Shots }) {
  const front = shots["pillar-1"];
  const back = shots["store-3"];
  if (!front) return null;
  return (
    <Box
      position="relative"
      w={{ base: "300px", md: "380px" }}
      h={{ base: "540px", md: "640px" }}
      mx="auto"
    >
      <Box
        position="absolute"
        inset="5%"
        borderRadius="full"
        bg="radial-gradient(closest-side, rgba(77,163,255,0.35), transparent)"
        filter="blur(30px)"
        aria-hidden
      />
      {back ? (
        <Box
          position="absolute"
          top="40px"
          left={{ base: "0", md: "0" }}
          transform="rotate(-7deg)"
          opacity={0.55}
          aria-hidden
        >
          <PhoneShot src={back} alt="" w={{ base: "190px", md: "230px" }} />
        </Box>
      ) : null}
      <Box position="absolute" top="0" right="0">
        <PhoneShot
          src={front}
          alt="The Nexzy feed: a trailer for a game in your library and news for a game on your wishlist"
          w={{ base: "230px", md: "280px" }}
        />
      </Box>
      <HStack
        position="absolute"
        bottom={{ base: "36px", md: "56px" }}
        left={{ base: "-4px", md: "-24px" }}
        gap={2}
        px={4}
        py={2.5}
        borderRadius="full"
        bg="nexzy.gold"
        color="nexzy.navy"
        boxShadow="0 12px 30px rgba(0,0,0,0.45)"
      >
        <Icon boxSize={3.5}>
          <FaNewspaper />
        </Icon>
        <Text fontSize="sm" fontWeight="700" whiteSpace="nowrap">
          Your feed, built from your games
        </Text>
      </HStack>
    </Box>
  );
}

function Hero({
  shots,
  live,
  goLive,
}: {
  shots: Shots;
  live: boolean;
  goLive: () => void;
}) {
  return (
    <Box
      as="section"
      pt={{ base: 24, md: 28 }}
      pb={SECTION_PY}
      bg="nexzy.navy"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="50%"
        height="120%"
        borderRadius="full"
        bg="nexzy.blue"
        opacity={0.12}
        filter="blur(110px)"
      />
      <Container maxW="6xl" position="relative" px={{ base: 5, md: 6 }}>
        <Flex
          direction={{ base: "column", lg: "row" }}
          align="center"
          gap={{ base: 12, lg: 10 }}
        >
          <Stack
            flex={{ lg: 1.25 }}
            gap={6}
            align={{ base: "center", lg: "start" }}
            textAlign={{ base: "center", lg: "left" }}
          >
            <HStack
              gap={2}
              px={3.5}
              py={1.5}
              borderRadius="full"
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.200"
              color="white"
              fontSize="sm"
              fontWeight="600"
            >
              <FaApple />
              <FaGooglePlay />
              <Text>The gaming app for iPhone and Android</Text>
            </HStack>

            <Heading
              as="h1"
              fontFamily="title"
              fontWeight="bold"
              lineHeight="1.08"
              color="white"
              fontSize={{ base: "34px", md: "44px", xl: "50px" }}
            >
              <Box
                as="span"
                display="block"
                whiteSpace={{ base: "normal", lg: "nowrap" }}
              >
                Follow the games you love.
              </Box>
              <Box
                as="span"
                display="block"
                whiteSpace={{ base: "normal", lg: "nowrap" }}
                style={GRADIENT_TEXT}
              >
                And the gamers who get them.
              </Box>
            </Heading>

            <Text
              fontSize={{ base: "md", md: "lg" }}
              color="#c9d1e6"
              maxW="xl"
              lineHeight="1.7"
            >
              <Text as="span" color="white" fontWeight="600">
                Nexzy is a gaming app, free to download.
              </Text>{" "}
              Follow any game and its news, trailers and updates land in one
              feed. Keep your library and wishlist in one place. And meet
              players who love the same games you do.
            </Text>

            <LaunchCard source="follow_hero" live={live} onLive={goLive} />

            {!live ? (
              <Text fontSize="sm" color="#8892A6">
                Want it now? Get Nexzy on the{" "}
                <InlineStoreLinks location="follow_hero_now" />. The new version
                arrives as a free update on Oct 21.
              </Text>
            ) : null}
          </Stack>

          <Box flex={{ lg: 1 }} w="full">
            <HeroPhones shots={shots} />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

function HowItWorks({ shots }: { shots: Shots }) {
  return (
    <Box as="section" py={SECTION_PY} bg="#161B33">
      <Container maxW="6xl" px={{ base: 5, md: 6 }}>
        <Stack gap={3} textAlign="center" mb={{ base: 12, md: 16 }}>
          <Text
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color="nexzy.gold"
          >
            How it works
          </Text>
          <Heading
            as="h2"
            fontFamily="title"
            size={{ base: "2xl", md: "3xl" }}
            color="white"
          >
            Three things, one app.
          </Heading>
        </Stack>
        <Stack gap={{ base: 14, md: 20 }}>
          {STEPS.map((s, i) => {
            const shot = shots[s.shot];
            const flip = i % 2 === 1;
            return (
              <Flex
                key={s.title}
                direction={{ base: "column", md: flip ? "row-reverse" : "row" }}
                align="center"
                justify="center"
                gap={{ base: 8, md: 16 }}
              >
                <Stack
                  flex={1}
                  maxW="lg"
                  gap={4}
                  textAlign={{ base: "center", md: "left" }}
                  align={{ base: "center", md: "start" }}
                >
                  <HStack gap={3}>
                    <Flex
                      w={10}
                      h={10}
                      align="center"
                      justify="center"
                      borderRadius="xl"
                      bg="nexzy.gold"
                      color="nexzy.navy"
                      fontFamily="title"
                      fontWeight="700"
                    >
                      {i + 1}
                    </Flex>
                    <Icon boxSize={5} color="nexzy.gold">
                      {s.icon}
                    </Icon>
                  </HStack>
                  <Heading
                    as="h3"
                    fontFamily="title"
                    size={{ base: "xl", md: "2xl" }}
                    color="white"
                    lineHeight="1.15"
                  >
                    {s.title}
                  </Heading>
                  <Text
                    color="#c9d1e6"
                    fontSize={{ base: "md", md: "lg" }}
                    lineHeight="1.7"
                  >
                    {s.body}
                  </Text>
                  <HStack
                    gap={2}
                    flexWrap="wrap"
                    justify={{ base: "center", md: "start" }}
                  >
                    {s.chips.map((c) => (
                      <Box
                        key={c}
                        px={3}
                        py={1}
                        borderRadius="full"
                        bg="#262C50"
                        border="1px solid"
                        borderColor="#333B66"
                        fontSize="sm"
                        fontWeight="600"
                        color="white"
                      >
                        {c}
                      </Box>
                    ))}
                  </HStack>
                </Stack>
                {shot ? (
                  <PhoneShot
                    src={shot}
                    alt={s.title}
                    w={{ base: "230px", md: "260px" }}
                  />
                ) : null}
              </Flex>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}

function BeforeNow() {
  return (
    <Box as="section" py={SECTION_PY} bg="nexzy.navy">
      <Container maxW="5xl" px={{ base: 5, md: 6 }}>
        <Stack gap={3} textAlign="center" mb={{ base: 10, md: 12 }}>
          <Text
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color="nexzy.gold"
          >
            Why we built it
          </Text>
          <Heading
            as="h2"
            fontFamily="title"
            size={{ base: "2xl", md: "3xl" }}
            color="white"
            lineHeight="1.15"
          >
            Keeping up with your games{" "}
            <Box as="span" style={GRADIENT_TEXT}>
              shouldn&apos;t be a side quest.
            </Box>
          </Heading>
        </Stack>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 4, md: 6 }}>
          <Box
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            bg="#141831"
            border="1px solid"
            borderColor="whiteAlpha.100"
          >
            <Text
              textTransform="uppercase"
              letterSpacing="0.16em"
              fontSize="xs"
              fontWeight="700"
              color="#7E88A8"
              mb={5}
            >
              Before
            </Text>
            <Stack gap={4}>
              {BEFORE.map((b) => (
                <HStack key={b} gap={3}>
                  <Icon boxSize={3.5} color="#7E88A8">
                    <FaXmark />
                  </Icon>
                  <Text
                    color="#7E88A8"
                    fontSize={{ base: "md", md: "lg" }}
                    textDecoration="line-through"
                    textDecorationColor="whiteAlpha.300"
                  >
                    {b}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Box>
          <Box
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            bg="linear-gradient(160deg, rgba(77,163,255,0.20), rgba(255,196,0,0.14))"
            border="1px solid"
            borderColor="nexzy.yellow/40"
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
              With Nexzy
            </Text>
            <Stack gap={4}>
              {NOW.map((b) => (
                <HStack key={b} gap={3}>
                  <Flex
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

function VideoSection() {
  return (
    <Box as="section" py={SECTION_PY} bg="#161B33">
      <Container maxW="5xl" px={{ base: 5, md: 6 }}>
        <Flex
          direction={{ base: "column", md: "row" }}
          align="center"
          gap={{ base: 10, md: 16 }}
          justify="center"
        >
          <Stack
            flex={1}
            maxW="md"
            gap={4}
            textAlign={{ base: "center", md: "left" }}
          >
            <Text
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.16em"
              color="nexzy.gold"
            >
              See it in action
            </Text>
            <Heading
              as="h2"
              fontFamily="title"
              size={{ base: "2xl", md: "3xl" }}
              color="white"
              lineHeight="1.15"
            >
              Follow a game. Watch your feed fill up.
            </Heading>
            <Text
              color="#c9d1e6"
              fontSize={{ base: "md", md: "lg" }}
              lineHeight="1.7"
            >
              A quick look at following games, posting about them and finding
              players with the same taste.
            </Text>
          </Stack>
          <Box
            w={{ base: "240px", md: "270px" }}
            aspectRatio={9 / 16}
            borderRadius="36px"
            overflow="hidden"
            border="5px solid"
            borderColor="#2A3157"
            bg="#1A1F3A"
            boxShadow="0 30px 80px rgba(0,0,0,0.55)"
            flexShrink={0}
          >
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
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

function Carousel({ shots }: { shots: Shots }) {
  const items = CAROUSEL.filter((c) => shots[c.shot]);
  if (!items.length) return null;
  return (
    <Box as="section" py={SECTION_PY} bg="nexzy.navy">
      <Container maxW="6xl" px={{ base: 5, md: 6 }}>
        <Heading
          as="h2"
          fontFamily="title"
          size={{ base: "2xl", md: "3xl" }}
          color="white"
          textAlign="center"
          mb={{ base: 8, md: 12 }}
        >
          More of the app.
        </Heading>
        <Flex
          gap={6}
          overflowX="auto"
          pb={4}
          justify={{ base: "start", lg: "center" }}
          style={{ scrollSnapType: "x mandatory" }}
        >
          {items.map((c) => (
            <Stack
              key={c.shot}
              gap={3}
              align="center"
              flexShrink={0}
              style={{ scrollSnapAlign: "center" }}
            >
              <PhoneShot
                src={shots[c.shot]}
                alt={c.alt}
                w={{ base: "200px", md: "220px" }}
              />
              <Text color="white" fontWeight="600" fontSize="sm">
                {c.label}
              </Text>
            </Stack>
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
    bg: "#262C50",
    color: "white",
    border: "1px solid",
    borderColor: "#333B66",
    _hover: { bg: "#2F3660" },
  };

  return (
    <Stack align="center" gap={4} textAlign="center">
      <Text color="white" fontWeight="600">
        Bring your squad
      </Text>
      <HStack gap={3} flexWrap="wrap" justify="center">
        {canShare ? (
          <Button {...pill} onClick={share}>
            <FaShareNodes /> Share
          </Button>
        ) : null}
        <Button asChild {...pill}>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("launch_share_click", { method: "x" })}
          >
            <FaXTwitter /> Post on X
          </a>
        </Button>
        <Button {...pill} onClick={copy}>
          {copied ? <FaCheck /> : <FaLink />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
      </HStack>
    </Stack>
  );
}

export default function FollowLaunch({ shots }: { shots: Shots }) {
  const [live, goLive] = useLive();

  return (
    <>
      <Hero shots={shots} live={live} goLive={goLive} />
      <HowItWorks shots={shots} />
      <BeforeNow />
      <VideoSection />
      <Carousel shots={shots} />

      <Box
        as="section"
        py={SECTION_PY}
        bg="#161B33"
        borderTop="1px solid"
        borderColor="nexzy.blue/20"
      >
        <Container maxW="3xl" px={{ base: 5, md: 6 }}>
          <Stack gap={8} align="center" textAlign="center">
            <Stack gap={3} align="center">
              <HStack gap={2} color="nexzy.gold">
                <BsFillLightningChargeFill />
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing="0.16em"
                >
                  {live ? "Out now" : "Wednesday, Oct 21"}
                </Text>
              </HStack>
              <Heading
                as="h2"
                fontFamily="title"
                size={{ base: "2xl", md: "3xl" }}
                color="white"
              >
                {live ? "The new Nexzy is here." : "Be there on day one."}
              </Heading>
            </Stack>
            <LaunchCard source="follow_cta" live={live} onLive={goLive} big />
            <ShareRow />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
