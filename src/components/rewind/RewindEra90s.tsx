import type { ReactNode } from "react";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { Anton } from "next/font/google";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const DISPLAY = anton.style.fontFamily; // title + condensed section bars
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
  backgroundImage: "url(/rewind/paper-90s-seamless.jpg)",
  backgroundRepeat: "repeat",
  backgroundSize: "512px 512px",
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

// 90s printed-magazine banner bars.
const BAR_BLUE =
  "linear-gradient(180deg, #4EA1FF 0%, #2876D2 50%, #124B99 100%)";
const BAR_GOLD = "linear-gradient(180deg, #FFD35A, #E0A21E)";
// Blue bar: light-blue top highlight + dark navy bottom shadow + slight bevel.
const BEVEL_BLUE =
  "inset 0 1px 0 rgba(150,200,255,.7), inset 0 -2px 0 rgba(6,20,45,.55), 0 1px 2px rgba(0,0,0,.35)";
const BEVEL_GOLD =
  "inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.30)";

/** Section heading: a filled gradient banner (very 90s game magazine). */
function SectionHead({ children }: { children: ReactNode }) {
  return (
    <Flex
      align="stretch"
      mb="14px"
      overflow="hidden"
      css={{ boxShadow: BEVEL_BLUE }}
    >
      <Box w="7px" bg={GOLD} />
      <Text
        flex="1"
        px="12px"
        py="6px"
        color="#fff"
        textTransform="uppercase"
        letterSpacing="1px"
        fontSize={{ base: "17px", md: "19px" }}
        css={{
          fontFamily: DISPLAY,
          background: BAR_BLUE,
          textShadow: "1px 1px 0 rgba(0,0,0,.4)",
        }}
      >
        {children}
      </Text>
    </Flex>
  );
}

/** A frame with gold L-shaped corner brackets (SNES-mag style). */
function CornerFrame({
  children,
  ratio,
  fill,
}: {
  children?: ReactNode;
  ratio?: string;
  fill?: boolean;
}) {
  const corner = (
    pos: Record<string, string>,
    edges: Record<string, string>,
  ) => <Box position="absolute" w="16px" h="16px" {...pos} {...edges} />;
  // `fill` fills the grid row height on desktop (so the cover lines up with the
  // Game Info block); on mobile (stacked) it falls back to the aspect ratio.
  const fillH = fill ? { base: "auto", md: "100%" } : undefined;
  return (
    <Box position="relative" h={fillH}>
      <Box
        border={`1px solid ${BORDER}`}
        bg="#0B1526"
        overflow="hidden"
        h={fillH}
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

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "110px 1fr", md: "140px 1fr" }}
      gap="10px"
      py="9px"
      borderBottom={last ? "none" : "1px solid"}
      borderColor="rgba(78,161,255,.2)"
      css={{ fontFamily: SANS }}
      fontSize={{ base: "14px", md: "15px" }}
      lineHeight="1.35"
    >
      <Text
        color={BLUE}
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="0.5px"
      >
        {label}:
      </Text>
      <Text color={TEXT}>{value}</Text>
    </Box>
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
    ? `${monthName(ep.event.month)} ${ep.event.day}, ${year ?? ""}${
        region ? ` (${region})` : ""
      }`
    : STUB;
  const publisher = ep.spec?.publisher ?? STUB;
  const developer = ep.spec?.developer ?? STUB;
  const players = ep.spec?.players ?? STUB_PLAYERS;

  const shots = ep.spec?.screenshots ?? [];
  const aboutImg = shots[0] ?? ep.heroImageUrl ?? null;
  const gallery = shots.length > 1 ? shots.slice(1, 5) : [];

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
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 7 }}>
        {/* TITLE */}
        <Heading
          as="h1"
          color="#fff"
          textTransform="uppercase"
          fontSize={{ base: "42px", md: "64px" }}
          lineHeight="0.95"
          letterSpacing="0.5px"
          css={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            textShadow: "3px 3px 0 #0B1526, 5px 5px 0 rgba(78,161,255,.35)",
          }}
        >
          {ep.title}
        </Heading>
        <Flex align="center" gap={3} mt="10px">
          {/* gold platform "sticker" */}
          <Box
            bg={GOLD}
            color="#10233F"
            px="12px"
            py="4px"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.5px"
            fontSize={{ base: "13px", md: "15px" }}
            css={{
              fontFamily: SANS,
              boxShadow: "2px 2px 0 rgba(0,0,0,.4)",
            }}
          >
            {system}
          </Box>
          <Box
            flex="1"
            h="3px"
            css={{
              background:
                "linear-gradient(to right, rgba(245,181,49,.9), rgba(245,181,49,0))",
            }}
          />
        </Flex>

        {/* BOX ART + GAME INFORMATION */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "300px 1fr" }}
          gap={{ base: 6, md: 7 }}
          mt={{ base: 6, md: 7 }}
          alignItems="start"
        >
          {ep.heroImageUrl && (
            <CornerFrame>
              <Image
                src={ep.heroImageUrl}
                alt={ep.imageAlt || ep.title}
                display="block"
                w="100%"
                h="auto"
                css={{ filter: PHOTO_FILTER }}
              />
            </CornerFrame>
          )}
          <Box
            bg="#0E1B33"
            border={`1px solid ${BORDER}`}
            css={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}
          >
            <Flex
              align="stretch"
              overflow="hidden"
              css={{ boxShadow: BEVEL_BLUE }}
            >
              <Box w="7px" bg={GOLD} />
              <Text
                flex="1"
                px={{ base: 3, md: 4 }}
                py="7px"
                color="#fff"
                textTransform="uppercase"
                letterSpacing="1px"
                fontSize={{ base: "16px", md: "18px" }}
                css={{
                  fontFamily: DISPLAY,
                  background: BAR_BLUE,
                  textShadow: "1px 1px 0 rgba(0,0,0,.4)",
                }}
              >
                Game Information
              </Text>
            </Flex>
            <Box px={{ base: 3, md: 4 }} py="6px">
              <InfoRow label="Publisher" value={publisher} />
              <InfoRow label="Developer" value={developer} />
              <InfoRow label="Genre" value={genre} />
              <InfoRow label="Players" value={players} />
              <InfoRow label="Release Date" value={releaseDate} />
              <InfoRow label="System" value={system} last />
            </Box>
          </Box>
        </Box>

        {/* GAME OVERVIEW + SCREENSHOT */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
          gap={{ base: 6, md: 7 }}
          mt={{ base: 7, md: 9 }}
          alignItems="start"
        >
          <Box>
            <SectionHead>Game Overview</SectionHead>
            <Box
              maxH={{ base: "none", md: "300px" }}
              overflowY="auto"
              pr="10px"
              css={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(78,161,255,.4) rgba(255,255,255,.06)",
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-track": {
                  background: "rgba(255,255,255,.06)",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(78,161,255,.4)",
                },
              }}
            >
              {overviewText.map((p, i) => (
                <Text
                  key={i}
                  mb="12px"
                  fontSize={{ base: "16px", md: "17px" }}
                  lineHeight="1.6"
                  letterSpacing="0"
                  color={TEXT}
                  css={{ fontFamily: SANS }}
                >
                  {p}
                </Text>
              ))}
            </Box>
          </Box>
          {aboutImg && (
            <CornerFrame ratio="1.14">
              <Image
                src={aboutImg}
                alt=""
                w="100%"
                h="100%"
                objectFit="contain"
                css={{ imageRendering: "pixelated", filter: PHOTO_FILTER }}
              />
            </CornerFrame>
          )}
        </Box>

        {/* SCREENSHOTS */}
        {gallery.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <SectionHead>Screenshots</SectionHead>
            <Box
              display="grid"
              gridTemplateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }}
              gap={{ base: 3, md: 4 }}
            >
              {gallery.map((src) => (
                <CornerFrame key={src} ratio="1.33">
                  <Image
                    src={src}
                    alt=""
                    w="100%"
                    h="100%"
                    objectFit="contain"
                    css={{ imageRendering: "pixelated", filter: PHOTO_FILTER }}
                  />
                </CornerFrame>
              ))}
            </Box>
          </Box>
        )}

        {/* KEY FEATURES + NEXZY SAYS (no review score) */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
          gap={{ base: 6, md: 8 }}
          mt={{ base: 7, md: 9 }}
          alignItems="start"
        >
          <Box>
            <SectionHead>Key Features</SectionHead>
            {features.map((f, i) => (
              <Flex key={i} gap={2} mb="9px" align="flex-start">
                <Text
                  color={GOLD}
                  fontWeight="700"
                  lineHeight="1.6"
                  fontSize={{ base: "15px", md: "16px" }}
                  css={{ fontFamily: SANS }}
                >
                  ▶
                </Text>
                <Text
                  fontSize={{ base: "16px", md: "17px" }}
                  lineHeight="1.6"
                  letterSpacing="0"
                  color={TEXT}
                  css={{ fontFamily: SANS }}
                >
                  {f}
                </Text>
              </Flex>
            ))}
          </Box>

          <Box
            border={`1px solid ${BORDER}`}
            css={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}
          >
            <Flex
              align="stretch"
              overflow="hidden"
              css={{ boxShadow: BEVEL_GOLD }}
            >
              <Box w="7px" bg={BLUE} />
              <Text
                flex="1"
                px={{ base: 3, md: 4 }}
                py="7px"
                color="#10233F"
                textTransform="uppercase"
                letterSpacing="1px"
                fontSize={{ base: "16px", md: "18px" }}
                css={{
                  fontFamily: DISPLAY,
                  background: BAR_GOLD,
                  textShadow: "1px 1px 0 rgba(255,255,255,.25)",
                }}
              >
                Nexzy Says!
              </Text>
            </Flex>
            <Text
              p={{ base: 4, md: 5 }}
              fontSize={{ base: "16px", md: "17px" }}
              lineHeight="1.6"
              letterSpacing="0"
              color={TEXT}
              css={{ fontFamily: SANS }}
            >
              {note}
            </Text>
          </Box>
        </Box>

        {/* FROM THE VAULT — era TV, only when there's a video */}
        {vids.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <SectionHead>From the Vault</SectionHead>
            <Flex justify="center">
              <RewindVault vids={vids} title={ep.title} year={year} compact />
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
}
