import type { ReactNode } from "react";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { Anton } from "next/font/google";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const DISPLAY = anton.style.fontFamily; // titles, headings, big numbers
const SANS =
  'Arial, "Helvetica Neue", "Liberation Sans", Helvetica, sans-serif';

const BLUE = "#4EA1FF";
const GOLD = "#F5C518";
const TEXT = "#E3E7EF";
const EDGE = "#2E5C9E";

// 2000s: same seamless navy tile as the 90s skin, with a subtle halftone dot
// overlay — uniform, no visible seams or bands.
const PAGE_BG = {
  backgroundColor: "#13233F",
  backgroundImage:
    "radial-gradient(rgba(255,255,255,.035) 1.1px, transparent 1.2px), url(/rewind/paper-90s-seamless.jpg)",
  backgroundRepeat: "repeat, repeat",
  backgroundSize: "5px 5px, 512px 512px",
};
const PHOTO_FILTER = "saturate(1) contrast(1.02)";

// HUD corner cut (top-left + bottom-right) for image frames.
const CUT =
  "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)";

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

/** Image frame — blue edge + HUD corner cut. */
function TechFrame({
  children,
  ratio,
}: {
  children: ReactNode;
  ratio: string;
}) {
  return (
    <Box css={{ clipPath: CUT }} bg={EDGE} p="2px" h="100%">
      <Box
        css={{ clipPath: CUT, aspectRatio: ratio }}
        bg="#0B1526"
        overflow="hidden"
      >
        {children}
      </Box>
    </Box>
  );
}

/** A screenshot in a tech frame. */
function Shot({ src, ratio }: { src: string; ratio: string }) {
  return (
    <TechFrame ratio={ratio}>
      <Image
        src={src}
        alt=""
        w="100%"
        h="100%"
        objectFit="cover"
        css={{ filter: PHOTO_FILTER }}
      />
    </TechFrame>
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
  const platformTag = ep.spec?.platforms?.[0] ?? "";
  const genre = ep.spec?.genres?.length ? ep.spec.genres.join(" / ") : STUB;
  const region = ep.event?.region
    ? (REGION[ep.event.region.toUpperCase()] ?? ep.event.region)
    : null;
  const releaseDate = ep.event
    ? `${monthName(ep.event.month)} ${ep.event.day}, ${year ?? ""}`
    : STUB;
  const publisher = ep.spec?.publisher ?? STUB;
  const developer = ep.spec?.developer ?? STUB;
  const players = ep.spec?.players ?? STUB_PLAYERS;

  const shots = ep.spec?.screenshots ?? [];
  // Always 4 images: the cover (main) + up to 3 screenshots.
  const cover = ep.heroImageUrl ?? shots[0] ?? null;
  const rest = (ep.heroImageUrl ? shots : shots.slice(1)).slice(0, 3);
  const hero = rest[0] ?? cover;
  const gridImgs = [cover, rest[1], rest[2]].filter((x): x is string => !!x);

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
  const heroCaption = ep.imageAlt || `Scenes from ${ep.title}`;
  const facts = features.slice(0, 3);
  const dropCap = {
    "&::first-letter": {
      float: "left",
      background: "#0B1526",
      color: BLUE,
      fontFamily: DISPLAY,
      fontSize: "34px",
      lineHeight: "1",
      padding: "4px 9px",
      marginRight: "8px",
      marginTop: "3px",
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
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 7 }}>
        {/* MASTHEAD */}
        <Flex
          justify="space-between"
          align="center"
          borderBottom={`2px solid ${BLUE}`}
          pb="8px"
        >
          <Text
            color="#fff"
            fontSize={{ base: "22px", md: "26px" }}
            letterSpacing="1px"
            css={{ fontFamily: DISPLAY, fontStyle: "italic" }}
          >
            REWIND
            <Box as="span" color={BLUE}>
              .
            </Box>
          </Text>
          {year && (
            <Text
              color={GOLD}
              fontWeight="800"
              fontSize={{ base: "10px", md: "12px" }}
              letterSpacing="0.14em"
              css={{ fontFamily: SANS }}
            >
              ON THIS DAY · {coverMonth} {year}
            </Text>
          )}
        </Flex>

        {/* HERO + SCREENSHOT GRID (the 4 images) */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1.7fr 1fr" }}
          gap={{ base: 3, md: 3 }}
          mt={{ base: 4, md: 5 }}
          alignItems="start"
        >
          {hero && (
            <Box position="relative">
              <Shot src={hero} ratio="1.6" />
              {platformTag && (
                <Box
                  position="absolute"
                  right="10px"
                  top="10px"
                  bg="rgba(11,21,38,.85)"
                  border={`2px solid ${GOLD}`}
                  borderRadius="20px"
                  color={GOLD}
                  px="6px"
                  py="8px"
                  fontSize="11px"
                  letterSpacing="2px"
                  css={{
                    fontFamily: DISPLAY,
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  {platformTag} CLASSIC
                </Box>
              )}
            </Box>
          )}
          {gridImgs.length > 0 && (
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              {gridImgs.map((src) => (
                <Shot key={src} src={src} ratio="1" />
              ))}
            </Box>
          )}
        </Box>

        {/* TITLE — chrome/metallic */}
        <Heading
          as="h1"
          color="#EAF0F9"
          textTransform="uppercase"
          fontSize={{ base: "40px", md: "58px" }}
          lineHeight="0.92"
          letterSpacing="0.5px"
          mt={{ base: 4, md: 5 }}
          css={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            textShadow:
              "0 1px 0 rgba(255,255,255,.35), 0 3px 3px rgba(0,0,0,.7), 0 6px 16px rgba(0,0,0,.55)",
          }}
        >
          {ep.title}
        </Heading>
        {tagline && (
          <Text
            mt="4px"
            color={BLUE}
            fontStyle="italic"
            fontSize={{ base: "15px", md: "17px" }}
            css={{ fontFamily: SANS }}
          >
            {tagline}
          </Text>
        )}

        {/* BODY (drop-cap 2-col) + NEXZY SAYS / YEAR */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1.55fr 1fr" }}
          gap={{ base: 6, md: 6 }}
          mt={{ base: 5, md: 6 }}
          alignItems="start"
        >
          <Box>
            <Box
              css={{
                columnCount: 1,
                columnGap: "18px",
                "@media (min-width: 768px)": { columnCount: 2 },
              }}
            >
              {overviewText.map((p, i) => (
                <Text
                  as="p"
                  key={i}
                  mb="10px"
                  fontSize={{ base: "13px", md: "13.5px" }}
                  lineHeight="1.55"
                  textAlign="justify"
                  color="#D7DEEC"
                  css={{ fontFamily: SANS, ...(i === 0 ? dropCap : {}) }}
                >
                  {p}
                </Text>
              ))}
            </Box>

            {/* platform diamond + hero caption */}
            <Flex align="center" gap={3} mt="12px">
              {platformTag && (
                <Flex
                  flexShrink={0}
                  w="64px"
                  h="64px"
                  align="center"
                  justify="center"
                  bg={GOLD}
                  css={{
                    transform: "rotate(45deg)",
                    boxShadow: "0 2px 6px rgba(0,0,0,.5)",
                  }}
                >
                  <Text
                    color="#10233F"
                    fontSize="11px"
                    textAlign="center"
                    lineHeight="1"
                    css={{ fontFamily: DISPLAY, transform: "rotate(-45deg)" }}
                  >
                    {platformTag}
                  </Text>
                </Flex>
              )}
              <Text
                fontSize="11px"
                color="#8fb3e6"
                fontStyle="italic"
                css={{ fontFamily: SANS }}
              >
                ▲ {heroCaption}
              </Text>
            </Flex>
          </Box>

          {/* RIGHT: NEXZY SAYS box + facts + big year */}
          <Box>
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
                fontSize={{ base: "14px", md: "15px" }}
                letterSpacing="0.5px"
                css={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  background: "linear-gradient(90deg,#124B99,#4EA1FF)",
                }}
              >
                NEXZY SAYS
              </Box>
              <Text
                px="12px"
                py="10px"
                fontSize={{ base: "13px", md: "14px" }}
                lineHeight="1.5"
                color="#D7DEEC"
                css={{ fontFamily: SANS }}
              >
                {note}
              </Text>
            </Box>

            {facts.length > 0 && (
              <Box mt="12px">
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

            {year && (
              <Flex justify="flex-end" align="center" gap={2} mt="12px">
                <Text
                  fontSize="10px"
                  color="#8fb3e6"
                  fontWeight="800"
                  letterSpacing="0.14em"
                >
                  ON THIS DAY
                </Text>
                <Box
                  bg="#124B99"
                  border={`3px solid ${GOLD}`}
                  borderRadius="8px"
                  px="12px"
                  color="#fff"
                  fontSize={{ base: "34px", md: "42px" }}
                  lineHeight="1.15"
                  css={{ fontFamily: DISPLAY }}
                >
                  {year}
                </Box>
              </Flex>
            )}
          </Box>
        </Box>

        {/* FROM THE VAULT — era TV, only when there's a video */}
        {vids.length > 0 && (
          <Box
            mt={{ base: 7, md: 8 }}
            bg="#080F1E"
            border="1px solid #24406A"
            borderRadius="12px"
            p={{ base: 4, md: 5 }}
          >
            <Flex align="center" gap={3} mb={4}>
              <Text
                color={GOLD}
                fontSize={{ base: "18px", md: "20px" }}
                css={{ fontFamily: DISPLAY }}
              >
                FROM THE VAULT
              </Text>
              <Box
                flex="1"
                h="2px"
                css={{
                  background: `linear-gradient(90deg,${BLUE},transparent)`,
                }}
              />
            </Flex>
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
