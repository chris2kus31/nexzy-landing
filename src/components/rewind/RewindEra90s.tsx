import type { ReactNode } from "react";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { Anton } from "next/font/google";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const DISPLAY = anton.style.fontFamily; // titles, tabs, headings
// Clean 90s-magazine editorial body (not typewriter/terminal).
const SANS =
  'Arial, "Helvetica Neue", "Liberation Sans", Helvetica, sans-serif';

const NAVY = "#13233F";
const BLUE = "#4EA1FF";
const GOLD = "#F5B531";
const TEXT = "#E3E7EF";
const BORDER = "#2A4F7A";

// 90s-only paper texture — a flattened, seamless navy tile (uniform lighting +
// feathered edges) so it repeats with no visible seams or lighter/darker bands.
const PAPER_BG = {
  backgroundColor: NAVY,
  backgroundImage:
    "radial-gradient(rgba(255,255,255,.035) 1.1px, transparent 1.2px), url(/rewind/paper-90s-seamless.jpg)",
  backgroundRepeat: "repeat, repeat",
  backgroundSize: "5px 5px, 512px 512px",
};
const PHOTO_FILTER = "saturate(.95) contrast(1.02)";

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

function stripMd(s: string): string {
  return (s || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}
function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** A frame with gold L-shaped corner brackets (SNES-mag style). */
function CornerFrame({
  children,
  ratio,
}: {
  children?: ReactNode;
  ratio?: string;
}) {
  const corner = (
    pos: Record<string, string>,
    edges: Record<string, string>,
  ) => <Box position="absolute" w="16px" h="16px" {...pos} {...edges} />;
  return (
    <Box position="relative">
      <Box
        border={`1px solid ${BORDER}`}
        bg="#0B1526"
        overflow="hidden"
        css={ratio ? { aspectRatio: ratio } : undefined}
      >
        {children}
      </Box>
      {corner(
        { top: "-2px", left: "-2px" },
        { borderTop: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` },
      )}
      {corner(
        { top: "-2px", right: "-2px" },
        { borderTop: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` },
      )}
      {corner(
        { bottom: "-2px", left: "-2px" },
        { borderBottom: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` },
      )}
      {corner(
        { bottom: "-2px", right: "-2px" },
        { borderBottom: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` },
      )}
    </Box>
  );
}

/** A screenshot in a corner frame with a small italic caption. */
function Shot({ src, ratio = "1.6" }: { src: string; ratio?: string }) {
  return (
    <CornerFrame ratio={ratio}>
      <Image
        src={src}
        alt=""
        w="100%"
        h="100%"
        objectFit="contain"
        css={{ imageRendering: "pixelated", filter: PHOTO_FILTER }}
      />
    </CornerFrame>
  );
}

export default function RewindEra90s({
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
  const releaseDate = ep.event
    ? `${monthName(ep.event.month)} ${ep.event.day}, ${year ?? ""}`
    : STUB;
  const publisher = ep.spec?.publisher ?? STUB;
  const developer = ep.spec?.developer ?? STUB;
  const players = ep.spec?.players ?? STUB_PLAYERS;

  const shots = ep.spec?.screenshots ?? [];
  // Always 4 images: the cover (main) + up to 3 screenshots.
  const cover = ep.heroImageUrl ?? shots[0] ?? null;
  const screens = (ep.heroImageUrl ? shots : shots.slice(1)).slice(0, 3);

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
  const compass: [string, ReactNode][] = [
    ["Publisher", publisher],
    ["Developer", developer],
    ["Players", players],
    ["Released", releaseDate],
    ["Origin", region ?? STUB],
    ["Category", genre],
  ];
  const dropCap = {
    "&::first-letter": {
      float: "left",
      fontFamily: DISPLAY,
      fontStyle: "italic",
      fontSize: "50px",
      lineHeight: "0.7",
      paddingRight: "9px",
      paddingTop: "2px",
      color: BLUE,
      textShadow: "2px 2px 0 #0B1526",
    },
  } as const;

  return (
    <Box
      w="100%"
      maxW="900px"
      mx="auto"
      my={{ base: 4, md: 8 }}
      color={TEXT}
      border={`1px solid ${BORDER}`}
      boxShadow="0 14px 40px rgba(0,0,0,.45)"
      overflow="hidden"
      position="relative"
      css={PAPER_BG}
    >
      {/* VERTICAL SPINE TAB */}
      <Box
        position="absolute"
        top="0"
        left="0"
        zIndex={2}
        w={{ base: "24px", md: "30px" }}
        h={{ base: "120px", md: "152px" }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        css={{
          background: "linear-gradient(180deg,#4EA1FF,#124B99)",
          borderBottomRightRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,.4)",
        }}
      >
        <Text
          color="#fff"
          fontSize={{ base: "12px", md: "14px" }}
          css={{
            fontFamily: DISPLAY,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            letterSpacing: "3px",
          }}
        >
          REWIND
        </Text>
      </Box>

      <Box
        pl={{ base: "34px", md: "48px" }}
        pr={{ base: 4, md: 7 }}
        py={{ base: 5, md: 7 }}
      >
        {/* HEADER: platform + gold flag */}
        <Flex
          justify="space-between"
          align="flex-start"
          gap={3}
          flexWrap="wrap"
        >
          <Box>
            <Text
              color={BLUE}
              fontSize={{ base: "22px", md: "28px" }}
              letterSpacing="1px"
              lineHeight="1"
              css={{ fontFamily: DISPLAY }}
            >
              {system && system !== STUB ? system : "Rewind"}
            </Text>
            {year && (
              <Text
                color={GOLD}
                fontWeight="800"
                fontSize="11px"
                letterSpacing="0.14em"
                mt="3px"
                css={{ fontFamily: SANS }}
              >
                {coverMonth ? `${coverMonth} ` : ""}
                {year} · ON THIS DAY
              </Text>
            )}
          </Box>
          <Box
            position="relative"
            bg={GOLD}
            color="#10233F"
            pl="16px"
            pr="46px"
            py="6px"
            fontSize={{ base: "14px", md: "16px" }}
            css={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              clipPath: "polygon(0 0,100% 0,88% 100%,0 100%)",
            }}
          >
            NEXZY REWIND
            <Box
              position="absolute"
              right="10px"
              top="0"
              bottom="0"
              w="26px"
              css={{
                background:
                  "repeating-linear-gradient(115deg,#10233F 0 4px,transparent 4px 9px)",
              }}
            />
          </Box>
        </Flex>

        {/* TITLE */}
        <Heading
          as="h1"
          color="#fff"
          fontSize={{ base: "32px", md: "46px" }}
          lineHeight="0.95"
          mt={{ base: 3, md: 4 }}
          css={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            textShadow: "2px 2px 0 #0B1526",
          }}
        >
          {ep.title}
        </Heading>

        {/* MAIN GRID: cover + compass | tagline + body + screenshots */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "0.85fr 1.15fr" }}
          gap={{ base: 6, md: 6 }}
          mt={{ base: 5, md: 6 }}
          alignItems="start"
        >
          {/* LEFT: cover + compass box */}
          <Box>
            {cover && (
              <CornerFrame>
                <Image
                  src={cover}
                  alt={ep.imageAlt || ep.title}
                  display="block"
                  w="100%"
                  h="auto"
                  css={{ filter: PHOTO_FILTER }}
                />
              </CornerFrame>
            )}
            <Box
              mt="12px"
              border={`1px solid ${BORDER}`}
              borderRadius="8px"
              bg="#0E1B33"
              p="10px 12px"
            >
              <Text mb="6px" fontSize="12px" css={{ fontFamily: SANS }}>
                <Box as="span" color={BLUE} fontWeight="800">
                  GAME{" "}
                </Box>
                <Box
                  as="span"
                  color={GOLD}
                  letterSpacing="1px"
                  css={{ fontFamily: DISPLAY }}
                >
                  COMPASS
                </Box>
              </Text>
              {compass.map(([label, value], i) => (
                <Flex
                  key={label}
                  justify="space-between"
                  gap={3}
                  py="5px"
                  borderTop={
                    i === 0 ? "none" : "1px solid rgba(78,161,255,.15)"
                  }
                  fontSize="12px"
                  css={{ fontFamily: SANS }}
                >
                  <Text color="#8fb3e6" fontWeight="700">
                    {label}
                  </Text>
                  <Text color={TEXT} textAlign="right">
                    {value}
                  </Text>
                </Flex>
              ))}
            </Box>
            {(screens[1] || screens[2]) && (
              <Box
                display="grid"
                gridTemplateColumns="1fr 1fr"
                gap={3}
                mt="12px"
              >
                {[screens[1], screens[2]]
                  .filter((s): s is string => !!s)
                  .map((src) => (
                    <Shot key={src} src={src} />
                  ))}
              </Box>
            )}

            {/* NEXZY SAYS — fills the left column under the screenshots */}
            <Box mt="16px">
              <Text
                color={GOLD}
                fontSize={{ base: "18px", md: "20px" }}
                mb="6px"
                css={{ fontFamily: DISPLAY }}
              >
                Nexzy Says!
              </Text>
              <Text
                fontSize={{ base: "15px", md: "16px" }}
                lineHeight="1.55"
                color="#D7DEEC"
                css={{ fontFamily: SANS }}
              >
                {note}
              </Text>
              {facts.length > 0 && (
                <>
                  <Text
                    color={BLUE}
                    fontSize="14px"
                    letterSpacing="1px"
                    mt="14px"
                    mb="6px"
                    css={{ fontFamily: DISPLAY }}
                  >
                    REWIND FACTS
                  </Text>
                  {facts.map((f, i) => (
                    <Flex key={i} gap={2} mb="6px" align="flex-start">
                      <Text color={GOLD} lineHeight="1.5">
                        ▸
                      </Text>
                      <Text
                        fontSize={{ base: "14px", md: "15px" }}
                        lineHeight="1.5"
                        color="#D7DEEC"
                        css={{ fontFamily: SANS }}
                      >
                        {f}
                      </Text>
                    </Flex>
                  ))}
                </>
              )}
            </Box>
          </Box>

          {/* RIGHT: tagline + drop-cap body + hero screenshot */}
          <Box>
            {tagline && (
              <Text
                color={BLUE}
                fontSize={{ base: "18px", md: "20px" }}
                lineHeight="1.1"
                mb="10px"
                css={{ fontFamily: DISPLAY, fontStyle: "italic" }}
              >
                {tagline}
              </Text>
            )}
            {overviewText.map((p, i) => (
              <Text
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
            {screens[0] && (
              <Box mt="6px">
                <Shot src={screens[0]} />
                <Text
                  fontSize="10px"
                  color="#8fb3e6"
                  mt="3px"
                  fontStyle="italic"
                  css={{ fontFamily: SANS }}
                >
                  ▲ {heroCaption}
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* FROM THE VAULT — wide dark block: era TV + clips fill the width */}
        {vids.length > 0 && (
          <Box
            mt={{ base: 7, md: 8 }}
            bg="#080F1E"
            border="1px solid #24406A"
            borderRadius="16px"
            p={{ base: 4, md: 5 }}
          >
            <Flex align="center" gap={3} mb={4}>
              <Text
                color="#fff"
                fontSize={{ base: "22px", md: "26px" }}
                css={{ fontFamily: DISPLAY }}
              >
                From the Vault
              </Text>
              <Box
                flex="1"
                h="3px"
                css={{
                  background: `linear-gradient(90deg,${GOLD},transparent)`,
                }}
              />
              {year && (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  flexShrink={0}
                  w="52px"
                  h="52px"
                  borderRadius="full"
                  bg={BLUE}
                  color="#0B1526"
                  css={{ border: `3px solid ${GOLD}`, fontFamily: DISPLAY }}
                  lineHeight="1"
                >
                  <Text fontSize="8px">REWIND</Text>
                  <Text fontSize="15px">&rsquo;{String(year).slice(2)}</Text>
                </Flex>
              )}
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
          borderTop={`1px solid ${BORDER}`}
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
