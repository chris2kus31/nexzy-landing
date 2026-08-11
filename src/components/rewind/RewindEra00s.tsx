import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { anton } from "@/lib/rewindFonts";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const DISPLAY = anton.style.fontFamily; // titles, headings, big numbers
const SANS =
  'Arial, "Helvetica Neue", "Liberation Sans", Helvetica, sans-serif';

const BLUE = "#4EA1FF";
const TITLE_BLUE = "#2E7BE0";
const GOLD = "#F5C518";
const RED = "#E23A3A";
const TEXT = "#E3E7EF";

// Same seamless navy tile + halftone dots as the 90s skin.
const PAGE_BG = {
  backgroundColor: "#13233F",
  backgroundImage:
    "radial-gradient(rgba(255,255,255,.035) 1.1px, transparent 1.2px), url(/rewind/paper-90s-seamless.jpg)",
  backgroundRepeat: "repeat, repeat",
  backgroundSize: "5px 5px, 512px 512px",
};
const PHOTO_FILTER = "saturate(1.02) contrast(1.03)";

const STUB = "—";
const STUB_PLAYERS = "1";
const STUB_FEATURES = [
  "A landmark title of its generation",
  "Simple to pick up, tough to master",
  "A piece of gaming history worth revisiting",
];
const REGION: Record<string, string> = {
  NA: "North America",
  US: "USA",
  JP: "Japan",
  EU: "Europe",
  PAL: "PAL",
  WW: "Worldwide",
};

function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function stripMd(s: string): string {
  return (s || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/** A screenshot tile with a bold caption bar (mag-style). */
function Tile({ src, label }: { src: string; label: string }) {
  return (
    <Box>
      <Box
        css={{ aspectRatio: "1" }}
        borderRadius="4px"
        overflow="hidden"
        border="1px solid #2E5C9E"
        bg="#0B1526"
      >
        <Image
          src={src}
          alt=""
          w="100%"
          h="100%"
          objectFit="cover"
          css={{ filter: PHOTO_FILTER }}
        />
      </Box>
      <Box
        mt="3px"
        py="2px"
        bg="#0B1526"
        color={GOLD}
        fontSize="9px"
        fontWeight="800"
        letterSpacing="0.08em"
        textAlign="center"
        css={{ fontFamily: SANS }}
      >
        {label}
      </Box>
    </Box>
  );
}

export default function RewindEra00s({
  ep,
}: {
  ep: RewindEpisode;
  stops: RewindStop[];
}) {
  const year = ep.event?.year ?? null;
  const vids = Array.from(
    new Set(
      [ep.youtubeUrl, ...(ep.videoUrls ?? [])]
        .map((u) => youTubeId(u))
        .filter((x): x is string => !!x),
    ),
  );
  const system = ep.spec?.platforms?.length
    ? ep.spec.platforms.join(" / ")
    : STUB;
  const genre = ep.spec?.genres?.length ? ep.spec.genres.join(" / ") : STUB;
  const region = ep.event?.region
    ? (REGION[ep.event.region.toUpperCase()] ?? ep.event.region)
    : null;
  const publisher = ep.spec?.publisher ?? STUB;
  const developer = ep.spec?.developer ?? STUB;
  const players = ep.spec?.players ?? STUB_PLAYERS;
  const maxPlayers = Math.min(
    4,
    Math.max(1, ...(players.match(/\d+/g)?.map(Number) ?? [1])),
  );

  const shots = ep.spec?.screenshots ?? [];
  // Always 4 images: the cover (main) + up to 3 screenshots.
  const cover = ep.heroImageUrl ?? shots[0] ?? null;
  const rest = (ep.heroImageUrl ? shots : shots.slice(1)).slice(0, 3);
  const tiles: { src: string; label: string }[] = [
    ...(cover ? [{ src: cover, label: "COVER" }] : []),
    ...rest.map((s, i) => ({ src: s, label: `SCREEN 0${i + 1}` })),
  ];

  const rawParas = (ep.bodyMarkdown || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const bulletLines = (ep.bodyMarkdown || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => stripMd(l.replace(/^[-*]\s+/, "")))
    .slice(0, 6);
  const features = ep.spec?.features?.length
    ? ep.spec.features
    : bulletLines.length
      ? bulletLines
      : STUB_FEATURES;
  const overview = rawParas
    .filter((p) => !/^[-*]\s+/.test(p) && !/^#{1,6}\s/.test(p))
    .map((p) => stripMd(p))
    .filter(Boolean);
  const overviewText = overview.length
    ? overview
    : [ep.excerpt || ""].filter(Boolean);
  const note =
    ep.spec?.historicalNote || ep.excerpt || "A small piece of gaming history.";
  const coverMonth = ep.event ? monthName(ep.event.month).toUpperCase() : "";
  const tagline = ep.excerpt?.trim() || "";
  const facts = features.slice(0, 3);
  const compass: [string, string, boolean?][] = [
    ["Publisher", publisher],
    ["Developer", developer],
    ["Genre", genre],
    ["Released", ep.event ? `${coverMonth} ${year ?? ""}`.trim() : STUB, true],
    ["Origin", region ?? STUB],
    ["System", system],
  ];
  const dropCap = {
    "&::first-letter": {
      float: "left",
      background: RED,
      color: "#fff",
      fontFamily: DISPLAY,
      fontSize: "40px",
      lineHeight: "1",
      padding: "4px 10px",
      marginRight: "9px",
      marginTop: "2px",
    },
  } as const;

  return (
    <Box
      w="100%"
      maxW="900px"
      mx="auto"
      my={{ base: 4, md: 8 }}
      color={TEXT}
      border="1px solid rgba(78,161,255,.25)"
      boxShadow="0 16px 44px rgba(0,0,0,.5)"
      overflow="hidden"
      position="relative"
      css={PAGE_BG}
    >
      {/* PRESS START tab */}
      <Box
        display="inline-block"
        bg={RED}
        color="#fff"
        fontWeight="800"
        fontSize="11px"
        letterSpacing="0.18em"
        px="16px"
        py="5px"
        css={{ borderBottomRightRadius: "10px" }}
      >
        PRESS START · ON THIS DAY
      </Box>

      <Box
        px={{ base: 5, md: 8 }}
        pb={{ base: 5, md: 7 }}
        pt={{ base: 3, md: 4 }}
      >
        {/* TITLE + GOLD MEDAL */}
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box flex="1" minW="0">
            <Heading
              as="h1"
              color={TITLE_BLUE}
              textTransform="uppercase"
              fontSize={{ base: "40px", md: "60px" }}
              lineHeight="0.85"
              letterSpacing="0.5px"
              css={{
                fontFamily: DISPLAY,
                fontStyle: "italic",
                textShadow: "3px 4px 0 #0A1226, 6px 7px 12px rgba(0,0,0,.6)",
              }}
            >
              {ep.title}
            </Heading>
            {tagline && (
              <Text
                mt="8px"
                color={GOLD}
                fontSize={{ base: "15px", md: "17px" }}
                css={{ fontFamily: DISPLAY }}
              >
                {tagline}
              </Text>
            )}
          </Box>
          {year && (
            <Box textAlign="center" flexShrink={0}>
              <Flex
                direction="column"
                align="center"
                justify="center"
                w={{ base: "60px", md: "72px" }}
                h={{ base: "60px", md: "72px" }}
                borderRadius="full"
                border="3px solid #fff"
                color="#5a3c00"
                css={{
                  background:
                    "radial-gradient(circle at 38% 32%, #FCE38A, #E0A21E)",
                  boxShadow: "0 3px 8px rgba(0,0,0,.5)",
                  fontFamily: DISPLAY,
                  lineHeight: "0.9",
                }}
              >
                <Text fontSize={{ base: "18px", md: "22px" }}>{year}</Text>
                <Text fontSize="7px" letterSpacing="0.5px">
                  ON THIS DAY
                </Text>
              </Flex>
              <Box
                mx="auto"
                w="0"
                h="0"
                css={{
                  borderLeft: "12px solid transparent",
                  borderRight: "12px solid transparent",
                  borderTop: "16px solid #124B99",
                }}
              />
            </Box>
          )}
        </Flex>

        {/* COMPASS + BODY */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "0.62fr 1.38fr" }}
          gap={{ base: 5, md: 5 }}
          mt={{ base: 5, md: 6 }}
          alignItems="start"
        >
          {/* GAME COMPASS panel */}
          <Box
            bg="#0B1526"
            border="1px solid #2E5C9E"
            borderRadius="8px"
            overflow="hidden"
          >
            <Box
              px="12px"
              py="5px"
              color="#fff"
              fontSize={{ base: "14px", md: "15px" }}
              css={{
                fontFamily: DISPLAY,
                background: "linear-gradient(90deg,#124B99,#4EA1FF)",
              }}
            >
              GAME COMPASS
            </Box>
            <Box px="12px" py="10px">
              <Text
                fontSize="9px"
                color="#8fb3e6"
                fontWeight="800"
                letterSpacing="0.1em"
                mb="5px"
              >
                PLAYERS
              </Text>
              <Flex gap="5px" mb="10px">
                {[0, 1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    w="20px"
                    h="20px"
                    borderRadius="full"
                    bg={i < maxPlayers ? (i % 2 ? GOLD : BLUE) : "#213a5e"}
                  />
                ))}
              </Flex>
              {compass.map(([label, value, gold], i) => (
                <Flex
                  key={label}
                  justify="space-between"
                  gap={2}
                  py="6px"
                  borderTop={
                    i === 0 ? "none" : "1px solid rgba(78,161,255,.14)"
                  }
                  fontSize="12px"
                  css={{ fontFamily: SANS }}
                >
                  <Text color="#8fb3e6">{label}</Text>
                  <Text
                    color={gold ? GOLD : TEXT}
                    fontWeight={gold ? "700" : "400"}
                    textAlign="right"
                  >
                    {value}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Box>

          {/* BODY — 2-col with red drop cap + red subhead */}
          <Box
            css={{
              columnCount: 1,
              columnGap: "16px",
              "@media (min-width: 768px)": { columnCount: 2 },
            }}
          >
            {overviewText[0] && (
              <Text
                as="p"
                mb="10px"
                fontSize={{ base: "14px", md: "15px" }}
                lineHeight="1.6"
                textAlign="justify"
                color="#D7DEEC"
                css={{ fontFamily: SANS, ...dropCap }}
              >
                {overviewText[0]}
              </Text>
            )}
            {overviewText.length > 1 && (
              <Text
                color={RED}
                fontSize={{ base: "15px", md: "16px" }}
                mt="4px"
                mb="4px"
                css={{ fontFamily: DISPLAY, breakInside: "avoid" }}
              >
                WHY IT STILL MATTERS
              </Text>
            )}
            {overviewText.slice(1).map((p, i) => (
              <Text
                as="p"
                key={i}
                mb="10px"
                fontSize={{ base: "14px", md: "15px" }}
                lineHeight="1.6"
                textAlign="justify"
                color="#D7DEEC"
                css={{ fontFamily: SANS }}
              >
                {p}
              </Text>
            ))}
          </Box>
        </Box>

        {/* THE VAULT FILES — captioned image grid */}
        {tiles.length > 0 && (
          <Box mt={{ base: 6, md: 7 }}>
            <Box
              display="inline-block"
              bg={RED}
              color="#fff"
              fontSize={{ base: "15px", md: "16px" }}
              px="14px"
              py="4px"
              css={{ fontFamily: DISPLAY, borderRadius: "4px 4px 0 0" }}
            >
              THE VAULT FILES
            </Box>
            <Box
              display="grid"
              gridTemplateColumns={{
                base: "1fr 1fr",
                md: "repeat(4, 1fr)",
              }}
              gap={2}
              bg="#12203c"
              border="1px solid #2E5C9E"
              p={2}
              css={{ borderRadius: "0 8px 8px 8px" }}
            >
              {tiles.map((t) => (
                <Tile key={t.src} src={t.src} label={t.label} />
              ))}
            </Box>
          </Box>
        )}

        {/* NEXZY SAYS + REWIND FACTS */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1.4fr 1fr" }}
          gap={{ base: 5, md: 6 }}
          mt={{ base: 6, md: 7 }}
          alignItems="start"
        >
          <Box
            border="1px solid #24406a"
            borderRadius="8px"
            overflow="hidden"
            bg="#0B1526"
          >
            <Box
              px="12px"
              py="5px"
              color="#fff"
              fontSize={{ base: "15px", md: "16px" }}
              css={{
                fontFamily: DISPLAY,
                background: "linear-gradient(90deg,#124B99,#4EA1FF)",
              }}
            >
              NEXZY SAYS
            </Box>
            <Text
              px="12px"
              py="10px"
              fontSize={{ base: "13px", md: "14px" }}
              lineHeight="1.55"
              color="#D7DEEC"
              css={{ fontFamily: SANS }}
            >
              {note}
            </Text>
          </Box>
          {facts.length > 0 && (
            <Box>
              <Box
                display="inline-block"
                bg={RED}
                color="#fff"
                fontSize="13px"
                px="12px"
                py="3px"
                mb="8px"
                css={{ fontFamily: DISPLAY, borderRadius: "4px" }}
              >
                REWIND FACTS
              </Box>
              {facts.map((f, i) => (
                <Flex key={i} gap={2} mb="6px" align="flex-start">
                  <Text color={GOLD} lineHeight="1.5">
                    ▸
                  </Text>
                  <Text
                    fontSize={{ base: "13px", md: "14px" }}
                    lineHeight="1.5"
                    color="#D7DEEC"
                    css={{ fontFamily: SANS }}
                  >
                    {f}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </Box>

        {/* FROM THE VAULT — era TV */}
        {vids.length > 0 && (
          <Box
            mt={{ base: 6, md: 7 }}
            bg="#080F1E"
            border="1px solid #24406A"
            borderRadius="12px"
            p={{ base: 4, md: 5 }}
          >
            <Box
              display="inline-block"
              bg={RED}
              color="#fff"
              fontSize={{ base: "15px", md: "16px" }}
              px="14px"
              py="4px"
              mb={4}
              css={{ fontFamily: DISPLAY, borderRadius: "4px" }}
            >
              FROM THE VAULT
            </Box>
            <Flex justify="center">
              <RewindVault vids={vids} title={ep.title} year={year} />
            </Flex>
          </Box>
        )}

        {/* FOOTER */}
        <Flex
          justify="space-between"
          align="center"
          borderTop="1px solid rgba(78,161,255,.25)"
          mt={{ base: 5, md: 6 }}
          pt="8px"
          fontSize="10px"
          color="#8fb3e6"
          css={{ fontFamily: SANS }}
        >
          <Text color="#fff" letterSpacing="1px" css={{ fontFamily: DISPLAY }}>
            NEXZY REWIND
          </Text>
          <Text>
            {coverMonth ? `${coverMonth} ` : ""}
            {year}
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}
