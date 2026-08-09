import type { ReactNode } from "react";
import { Box, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { VT323, Courier_Prime } from "next/font/google";
import type { RewindEpisode } from "@/lib/blog/api";
import type { RewindStop } from "@/components/rewind/RewindScrubber";
import RewindVault from "@/components/rewind/RewindVault";
import { monthName } from "@/lib/rewind/era";

const vt = VT323({ weight: "400", subsets: ["latin"], display: "swap" });
const courier = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});
const VT = vt.style.fontFamily; // titles, section headings, labels
const MONO = courier.style.fontFamily; // body, spec, captions, lists

const RETRO = {
  paper: "#13233F", // page base
  blue: "#4EA1FF", // titles + section headings (VT323)
  red: "#E33D35", // red accent
  yellow: "#FFD200", // yellow accent
  ink: "#E3E7EF", // body text
  secondary: "#A3B0C7", // secondary text (labels, subtitle, footer)
  border: "#2A4F7A", // image borders
  caption: "#A3B0C7",
  rule: "#2A3F66", // dotted rules
};
const PHOTO_FILTER = "saturate(.9) contrast(1.03)";

// Paper: Nexzy dark-blue stock. The texture is already navy, so it tiles
// straight over the base — no overlay, gradient, or CSS grain.
const PAPER_BG = {
  backgroundColor: "#13233F",
  backgroundImage: "url(/rewind/paper-80s-neon.png)",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const REGION: Record<string, string> = {
  NA: "North America",
  US: "US",
  JP: "Japan",
  EU: "Europe",
  PAL: "PAL",
  WW: "Worldwide",
};

// Hardcoded stubs — shown until we AI-enrich + add real columns (needs a
// migration). Publisher/Developer/Players/Rating aren't in the data yet.
const STUB = "—";
const STUB_PLAYERS = "1";
const STUB_FEATURES = [
  "A landmark title of its generation",
  "Simple to pick up, tough to put down",
  "A piece of gaming history worth revisiting",
];

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

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <Box mb="14px">
      <Text
        color={RETRO.blue}
        fontWeight="400"
        fontSize={{ base: "24px", md: "30px" }}
        letterSpacing="1px"
        lineHeight="1"
        textTransform="uppercase"
        css={{ fontFamily: VT }}
      >
        {children}
      </Text>
      {/* Bold dotted rule BELOW the heading. */}
      <Box
        mt="8px"
        h="4px"
        css={{
          backgroundImage:
            "radial-gradient(circle, #2A3F66 1.7px, transparent 2.1px)",
          backgroundSize: "11px 4px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left center",
        }}
      />
    </Box>
  );
}

function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "120px 1fr", md: "150px 1fr" }}
      gap="8px"
      mb="7px"
      css={{ fontFamily: MONO }}
      lineHeight="1.35"
    >
      <Text
        fontSize="14px"
        fontWeight="700"
        color={RETRO.secondary}
        textTransform="uppercase"
      >
        {label}:
      </Text>
      <Text fontSize="15px" fontWeight="400" color={RETRO.ink}>
        {value}
      </Text>
    </Box>
  );
}

function Photo({
  src,
  alt = "",
  ratio,
}: {
  src: string;
  alt?: string;
  ratio: string;
}) {
  return (
    <Box
      position="relative"
      bg="#0B1526"
      overflow="hidden"
      border={`1px solid ${RETRO.border}`}
      css={{ aspectRatio: ratio }}
    >
      <Image
        src={src}
        alt={alt}
        w="100%"
        h="100%"
        objectFit="contain"
        css={{ imageRendering: "pixelated", filter: PHOTO_FILTER }}
      />
    </Box>
  );
}

export default function RewindEra80s({
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

  const shots = ep.spec?.screenshots ?? [];
  const aboutImg = shots[0] ?? ep.heroImageUrl ?? null;
  const gallery = shots.length > 1 ? shots.slice(1, 4) : [];

  // Body → About the Game. Drop bullet blocks (they feed Features); keep
  // headings as small subheads. Stubbed features unless the writer left bullets.
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
  const publisher = ep.spec?.publisher ?? STUB;
  const developer = ep.spec?.developer ?? STUB;
  const players = ep.spec?.players ?? STUB_PLAYERS;
  const aboutParas = rawParas
    .filter((p) => !/^[-*]\s+/.test(p))
    .map((p) => stripMd(p))
    .filter(Boolean);
  const aboutText = aboutParas.length
    ? aboutParas
    : [ep.excerpt || ""].filter(Boolean);

  // "Nexzy Says!" is a historical note (not a review) — the LLM's historical
  // note, else the article's hook, else a short line from the body.
  const verdict =
    ep.spec?.historicalNote ||
    ep.excerpt ||
    aboutParas
      .join(" ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .find((s) => s.length >= 24 && s.length <= 110) ||
    "A small piece of gaming history.";

  return (
    <Box
      w="100%"
      maxW="900px"
      mx="auto"
      my={{ base: 4, md: 8 }}
      color={RETRO.ink}
      border={`1px solid ${RETRO.border}`}
      boxShadow="0 14px 40px rgba(0,0,0,.45)"
      overflow="hidden"
      position="relative"
      css={PAPER_BG}
    >
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 7 }}>
        {/* TITLE */}
        <Heading
          as="h1"
          color={RETRO.blue}
          textTransform="uppercase"
          fontWeight="400"
          fontSize={{ base: "42px", md: "64px" }}
          lineHeight="0.9"
          letterSpacing="1px"
          css={{ fontFamily: VT }}
        >
          {ep.title}
        </Heading>
        <Text
          mt="6px"
          color={RETRO.secondary}
          textTransform="uppercase"
          fontWeight="700"
          fontSize={{ base: "15px", md: "18px" }}
          lineHeight="1.2"
          letterSpacing="0.5px"
          css={{ fontFamily: MONO }}
        >
          ({system})
        </Text>

        {/* BOX ART + GAME INFO */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "300px 1fr" }}
          gap={{ base: 5, md: 7 }}
          mt={{ base: 5, md: 6 }}
          alignItems="start"
        >
          {ep.heroImageUrl && (
            <Box
              position="relative"
              overflow="hidden"
              bg="#0B1526"
              border={`1px solid ${RETRO.border}`}
            >
              <Image
                src={ep.heroImageUrl}
                alt={ep.imageAlt || ep.title}
                display="block"
                w="100%"
                h="auto"
                css={{ filter: PHOTO_FILTER }}
              />
            </Box>
          )}
          <Box>
            <SectionHeader>Game Info</SectionHeader>
            <SpecRow label="Publisher" value={publisher} />
            <SpecRow label="Developer" value={developer} />
            <SpecRow label="Genre" value={genre} />
            <SpecRow label="Players" value={players} />
            <SpecRow label="Release Date" value={releaseDate} />
            <SpecRow label="System" value={system} />
          </Box>
        </Box>

        {/* ABOUT THE GAME — two columns; the dotted rule belongs ONLY to the
            text column, and the screenshot top-aligns with the heading. */}
        <Box
          mt={{ base: 7, md: 9 }}
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "48% 48%" }}
          gap={{ base: 5, md: "4%" }}
          alignItems="start"
        >
          <Box>
            <SectionHeader>About the Game</SectionHeader>
            <Box
              maxH={{ base: "260px", md: "300px" }}
              overflowY="auto"
              pr="12px"
              css={{
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-track": {
                  background: "rgba(255,255,255,.06)",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(78,161,255,.4)",
                },
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(78,161,255,.4) rgba(255,255,255,.06)",
              }}
            >
              {aboutText.map((p, i) => {
                const h = p.match(/^(#{1,6})\s+(.*)$/);
                if (h) {
                  return (
                    <Text
                      key={i}
                      mt={i === 0 ? "0" : "12px"}
                      mb="4px"
                      color={RETRO.blue}
                      fontWeight="700"
                      textTransform="uppercase"
                      fontSize="14px"
                      letterSpacing="1px"
                      css={{ fontFamily: MONO }}
                    >
                      {h[2]}
                    </Text>
                  );
                }
                return (
                  <Text
                    key={i}
                    mb="11px"
                    fontSize={{ base: "15px", md: "16px" }}
                    lineHeight="1.65"
                    letterSpacing="0"
                    color={RETRO.ink}
                    css={{ fontFamily: MONO }}
                  >
                    {p}
                  </Text>
                );
              })}
            </Box>
          </Box>
          {aboutImg && <Photo src={aboutImg} alt={ep.title} ratio="1.4" />}
        </Box>

        {/* SCREEN SHOTS */}
        {gallery.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <SectionHeader>Screen Shots</SectionHeader>
            <Box
              display="grid"
              gridTemplateColumns={{ base: "1fr 1fr", md: "repeat(3, 1fr)" }}
              gap={{ base: 3, md: 4 }}
            >
              {gallery.map((src) => (
                <Photo key={src} src={src} ratio="1.35" />
              ))}
            </Box>
          </Box>
        )}

        {/* FEATURES + NEXZY SAYS */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
          gap={{ base: 6, md: 8 }}
          mt={{ base: 7, md: 9 }}
          alignItems="start"
        >
          <Box>
            <SectionHeader>Game Features</SectionHeader>
            {features.map((f, i) => (
              <Text
                key={i}
                mb="8px"
                fontSize={{ base: "15px", md: "16px" }}
                lineHeight="1.5"
                color={RETRO.ink}
                css={{ fontFamily: MONO }}
              >
                - {f}
              </Text>
            ))}
          </Box>

          <Box
            border="1px dashed"
            borderColor={RETRO.blue}
            p={{ base: 4, md: 5 }}
          >
            <Text
              textAlign="center"
              color={RETRO.blue}
              fontWeight="400"
              textTransform="uppercase"
              fontSize={{ base: "24px", md: "28px" }}
              letterSpacing="1px"
              lineHeight="1"
              mb="10px"
              css={{ fontFamily: VT }}
            >
              Nexzy Says!
            </Text>
            <Text
              textAlign="center"
              fontSize={{ base: "15px", md: "16px" }}
              lineHeight="1.55"
              color={RETRO.ink}
              css={{ fontFamily: MONO }}
            >
              {verdict}
            </Text>
          </Box>
        </Box>

        {/* FROM THE VAULT — kept from before (you asked for the TV) */}
        {vids.length > 0 && (
          <Box mt={{ base: 7, md: 9 }}>
            <SectionHeader>From the Vault</SectionHeader>
            <Flex justify="center">
              <RewindVault vids={vids} title={ep.title} year={year} compact />
            </Flex>
          </Box>
        )}
      </Box>

      {/* FOOTER */}
      <Flex
        justify="space-between"
        align="center"
        px={{ base: 5, md: 8 }}
        py="12px"
        borderTop="3px double"
        borderColor={RETRO.rule}
        color={RETRO.secondary}
        textTransform="uppercase"
        fontSize={{ base: "12px", md: "13px" }}
        css={{ fontFamily: MONO }}
      >
        <Text>© {year ?? ""} Nexzy Magazine</Text>
        <Text color={RETRO.blue} fontWeight="700">
          Top of Page ▲
        </Text>
      </Flex>
    </Box>
  );
}
