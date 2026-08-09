import type { ReactNode } from "react";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { Anton } from "next/font/google";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const DISPLAY = anton.style.fontFamily; // chrome title
const SANS =
  'Arial, "Helvetica Neue", "Liberation Sans", Helvetica, sans-serif';

const BLUE = "#4EA1FF";
const GOLD = "#F5C518";
const TEXT = "#E3E7EF";
const EDGE = "#2E5C9E";

// 2000s: the paper texture, tiled uniformly (no gradient/overlay). Lighting was
// flattened so tiling reads uniform top-to-bottom with no visible bands.
const PAGE_BG = {
  backgroundColor: "#0A1226",
  backgroundImage: "url(/rewind/paper-00s-navy.png)",
  backgroundRepeat: "repeat",
  backgroundSize: "1024px 683px",
};
const PHOTO_FILTER = "saturate(1) contrast(1.02)";

// HUD corner cut (top-left + bottom-right) for panels/frames.
const CUT =
  "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)";
// Bar cut (angled bottom-right).
const BARCUT = "polygon(0 0, 100% 0, 100% 58%, calc(100% - 16px) 100%, 0 100%)";
const PANEL_BG = "linear-gradient(160deg, #12294a 0%, #0A1626 100%)";

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

/** Glossy blue HUD header bar with an angled corner. */
function BarHead({ children }: { children: ReactNode }) {
  return (
    <Box
      mb="14px"
      css={{
        clipPath: BARCUT,
        background: "linear-gradient(180deg, #2E6FD6 0%, #12326A 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)",
      }}
    >
      <Text
        px={{ base: 3, md: 4 }}
        py="7px"
        color="#fff"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="1.5px"
        fontSize={{ base: "14px", md: "16px" }}
        css={{ fontFamily: SANS, textShadow: "0 1px 2px rgba(0,0,0,.5)" }}
      >
        {children}
      </Text>
    </Box>
  );
}

/** A dark glossy panel with a thin blue edge + HUD corner cut. */
function Panel({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <Box css={{ clipPath: CUT }} bg={EDGE} p="1px" h="100%">
      <Box
        css={{ clipPath: CUT, background: PANEL_BG }}
        p={padded ? { base: 4, md: 5 } : "0"}
        h="100%"
      >
        {children}
      </Box>
    </Box>
  );
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
    <Box css={{ clipPath: CUT }} bg={EDGE} p="2px">
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

function InfoRow({
  label,
  value,
  gold,
  last,
}: {
  label: string;
  value: ReactNode;
  gold?: boolean;
  last?: boolean;
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "120px 1fr", md: "140px 1fr" }}
      gap="10px"
      py="10px"
      borderBottom={last ? "none" : "1px solid"}
      borderColor="rgba(78,161,255,.16)"
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
      <Text color={gold ? GOLD : TEXT} fontWeight={gold ? "700" : "400"}>
        {value}
      </Text>
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
      border="1px solid rgba(78,161,255,.25)"
      boxShadow="0 16px 44px rgba(0,0,0,.5)"
      overflow="hidden"
      position="relative"
      css={PAGE_BG}
    >
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 7 }}>
        {/* TITLE — chrome/metallic */}
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box>
            <Heading
              as="h1"
              textTransform="uppercase"
              fontSize={{ base: "40px", md: "58px" }}
              lineHeight="0.95"
              letterSpacing="0.5px"
              css={{
                fontFamily: DISPLAY,
                fontStyle: "italic",
                backgroundImage:
                  "linear-gradient(180deg,#ffffff 0%,#d6deea 42%,#8492aa 60%,#c3cddc 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,.55))",
              }}
            >
              {ep.title}
            </Heading>
            <Text
              mt="6px"
              color={GOLD}
              textTransform="uppercase"
              fontWeight="700"
              letterSpacing="0.5px"
              fontSize={{ base: "14px", md: "16px" }}
              css={{ fontFamily: SANS }}
            >
              ({system})
            </Text>
          </Box>
          {/* tech deco */}
          <Flex gap="4px" mt="10px" display={{ base: "none", md: "flex" }}>
            {[10, 16, 22, 14, 20].map((h, i) => (
              <Box
                key={i}
                w="7px"
                h={`${h}px`}
                bg={i % 2 ? "rgba(78,161,255,.5)" : "rgba(78,161,255,.9)"}
              />
            ))}
          </Flex>
        </Flex>

        {/* BOX ART + GAME INFORMATION */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "300px 1fr" }}
          gap={{ base: 6, md: 7 }}
          mt={{ base: 6, md: 7 }}
          alignItems="stretch"
        >
          {ep.heroImageUrl && (
            <TechFrame ratio="0.72">
              <Image
                src={ep.heroImageUrl}
                alt={ep.imageAlt || ep.title}
                w="100%"
                h="100%"
                objectFit="contain"
                css={{ filter: PHOTO_FILTER }}
              />
            </TechFrame>
          )}
          <Panel padded={false}>
            <BarHead>Game Information</BarHead>
            <Box px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }} mt="-6px">
              <InfoRow label="Publisher" value={publisher} />
              <InfoRow label="Developer" value={developer} />
              <InfoRow label="Genre" value={genre} />
              <InfoRow label="Players" value={players} />
              <InfoRow label="Release Date" value={releaseDate} gold />
              <InfoRow label="System" value={system} last />
            </Box>
          </Panel>
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
            <BarHead>Game Overview</BarHead>
            <Box
              maxH={{ base: "none", md: "320px" }}
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
                  color={TEXT}
                  css={{ fontFamily: SANS }}
                >
                  {p}
                </Text>
              ))}
            </Box>
          </Box>
          {aboutImg && (
            <TechFrame ratio="1.5">
              <Image
                src={aboutImg}
                alt=""
                w="100%"
                h="100%"
                objectFit="cover"
                css={{ filter: PHOTO_FILTER }}
              />
            </TechFrame>
          )}
        </Box>

        {/* SCREENSHOTS */}
        {gallery.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <BarHead>Screenshots</BarHead>
            <Box
              display="grid"
              gridTemplateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }}
              gap={{ base: 3, md: 4 }}
            >
              {gallery.map((src) => (
                <TechFrame key={src} ratio="1.6">
                  <Image
                    src={src}
                    alt=""
                    w="100%"
                    h="100%"
                    objectFit="cover"
                    css={{ filter: PHOTO_FILTER }}
                  />
                </TechFrame>
              ))}
            </Box>
          </Box>
        )}

        {/* KEY FEATURES + NEXZY SAYS (no score) */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
          gap={{ base: 6, md: 7 }}
          mt={{ base: 7, md: 9 }}
          alignItems="stretch"
        >
          <Panel>
            <BarHead>Key Features</BarHead>
            {features.map((f, i) => (
              <Flex key={i} gap={2} mb="9px" align="flex-start">
                <Text color={BLUE} fontWeight="700" lineHeight="1.6">
                  ▸
                </Text>
                <Text
                  fontSize={{ base: "15px", md: "16px" }}
                  lineHeight="1.6"
                  color={TEXT}
                  css={{ fontFamily: SANS }}
                >
                  {f}
                </Text>
              </Flex>
            ))}
          </Panel>

          <Panel>
            <BarHead>Nexzy Says!</BarHead>
            <Text
              fontSize={{ base: "16px", md: "17px" }}
              lineHeight="1.6"
              color={TEXT}
              css={{ fontFamily: SANS }}
            >
              {note}
            </Text>
          </Panel>
        </Box>

        {/* FROM THE VAULT — era TV, only when there's a video */}
        {vids.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <BarHead>From the Vault</BarHead>
            <Flex justify="center">
              <RewindVault vids={vids} title={ep.title} year={year} compact />
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
}
