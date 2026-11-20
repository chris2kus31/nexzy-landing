// ============================================
// FILE: components/blog/ArticleBlocks.tsx
// The renderers behind the article blocks parsed in lib/blog/md-blocks.ts:
// callout cards (tip, note, heads up, takeaways, update, correction, pros,
// cons, steps, facts, timeline, patch notes), pull quote, verdict, spoiler,
// FAQ, read-next card, image compare, video/social embeds, gallery and the
// "stat card" table. Server-safe (no hooks) so articles stay SSR for SEO; the
// compare slider is the only client piece.
// ============================================
import type { ReactNode } from "react";
import NextLink from "next/link";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import {
  FiZap,
  FiInfo,
  FiAlertTriangle,
  FiList,
  FiClock,
  FiEdit3,
  FiPlus,
  FiMinus,
  FiHash,
  FiGrid,
  FiCalendar,
  FiTool,
  FiEyeOff,
  FiHelpCircle,
  FiArrowRight,
  FiArrowUpRight,
  FiChevronDown,
  FiAward,
  FiBookOpen,
  FiColumns,
  FiMessageSquare,
} from "react-icons/fi";
import {
  FaXTwitter,
  FaBluesky,
  FaReddit,
  FaInstagram,
  FaThreads,
} from "react-icons/fa6";
import type { BlockKind, Embed } from "@/lib/blog/md-blocks";
import CompareSlider from "@/components/blog/CompareSlider";
import PatchBoard from "@/components/blog/PatchBoard";
import type { PatchBoardData } from "@/lib/blog/patch";

export type Palette = Record<
  | "body"
  | "heading"
  | "strong"
  | "link"
  | "quoteBorder"
  | "quoteText"
  | "caption"
  | "tFrame"
  | "tBorder"
  | "tRule"
  | "tRail"
  | "tLabel"
  | "tHeadBg"
  | "tHeadRule"
  | "tName"
  | "tHover"
  | "tCard"
  | "tCardHead",
  string
>;
type Tone = "dark" | "paper";
type P = { children?: ReactNode } & Record<string, unknown>;

const INK = {
  gold: { dark: "#FFD700", paper: "#a8741a" },
  blue: { dark: "#4DA3FF", paper: "#2d6fb3" },
  red: { dark: "#FF6B57", paper: "#b23a1e" },
  green: { dark: "#3DDC97", paper: "#2f7d4f" },
  gray: { dark: "#A9B0CF", paper: "#6b5b45" },
  purple: { dark: "#B18CFF", paper: "#6b4fa0" },
};
type Ink = keyof typeof INK;

const KINDS: Record<BlockKind, { label: string; icon: IconType; ink: Ink }> = {
  TIP: { label: "Pro tip", icon: FiZap, ink: "gold" },
  NOTE: { label: "Good to know", icon: FiInfo, ink: "blue" },
  WARNING: { label: "Heads up", icon: FiAlertTriangle, ink: "red" },
  KEY: { label: "The short version", icon: FiList, ink: "gold" },
  UPDATE: { label: "Update", icon: FiClock, ink: "blue" },
  CORRECTION: { label: "Correction", icon: FiEdit3, ink: "gray" },
  QUOTE: { label: "Quote", icon: FiMessageSquare, ink: "gold" },
  VERDICT: { label: "Verdict", icon: FiAward, ink: "gold" },
  PROS: { label: "The good", icon: FiPlus, ink: "green" },
  CONS: { label: "The bad", icon: FiMinus, ink: "red" },
  STEPS: { label: "Step by step", icon: FiHash, ink: "gold" },
  FACTS: { label: "The details", icon: FiGrid, ink: "blue" },
  TIMELINE: { label: "Timeline", icon: FiCalendar, ink: "blue" },
  PATCH: { label: "Patch notes", icon: FiTool, ink: "gold" },
  SPOILER: { label: "Spoiler", icon: FiEyeOff, ink: "purple" },
  FAQ: { label: "Questions", icon: FiHelpCircle, ink: "blue" },
  READ: { label: "Read next", icon: FiBookOpen, ink: "gold" },
  COMPARE: { label: "Compare", icon: FiColumns, ink: "gold" },
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const json = <T,>(v: unknown): T | null => {
  try {
    return JSON.parse(str(v)) as T;
  } catch {
    return null;
  }
};

// ---- shared bits -------------------------------------------------------------

function Chip({
  icon: Icon,
  accent,
  tone,
}: {
  icon: IconType;
  accent: string;
  tone: Tone;
}) {
  return (
    <Flex
      flex="0 0 auto"
      w="24px"
      h="24px"
      align="center"
      justify="center"
      borderRadius="7px"
      bg={accent}
      color={tone === "dark" ? "#12152a" : "#fdf6e6"}
    >
      <Icon size={13} strokeWidth={2.6} />
    </Flex>
  );
}

function Label({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <Text
      as="span"
      fontSize="xs"
      fontWeight="800"
      letterSpacing="0.12em"
      textTransform="uppercase"
      color={accent}
    >
      {children}
    </Text>
  );
}

/** Body text rules every card shares (tight paragraphs, small headings). */
const bodyCss = (c: Palette) => ({
  "& p": { mb: 2 },
  "& p:last-child": { mb: 0 },
  "& h2, & h3, & h4": { fontSize: "md", mt: 4, mb: 1.5, color: c.heading },
  "& h2:first-child, & h3:first-child, & h4:first-child": { mt: 0 },
  "& ul, & ol": { pl: 0, mb: 0, listStyleType: "none" },
  "& li::marker": { content: '""' },
  "& li": { position: "relative", mb: 2, minH: 0, pl: 0 },
  // Neutral base so a host renderer's list bullets never bleed in; each kind
  // then draws its own marker (see listCss).
  "& li::before": {
    content: "none",
    border: "none",
    background: "none",
    boxShadow: "none",
    width: "auto",
    height: "auto",
    borderRadius: 0,
  },
  "& li:last-child": { mb: 0 },
});

/** Merge selector maps one level deep (so "& li" from both sides combine). */
function mergeCss(
  a: Record<string, unknown>,
  b?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    const prev = out[k];
    out[k] =
      prev && typeof prev === "object" && v && typeof v === "object"
        ? { ...(prev as object), ...(v as object) }
        : v;
  }
  return out;
}

/** Per-kind list treatment. */
function listCss(
  kind: BlockKind,
  accent: string,
  c: Palette,
): Record<string, unknown> {
  const diamond = {
    "& li": { pl: 6 },
    "& li::before": {
      content: '""',
      position: "absolute",
      left: "4px",
      top: "0.62em",
      w: "8px",
      h: "8px",
      bg: accent,
      borderRadius: "2px",
      transform: "rotate(45deg)",
    },
  };
  switch (kind) {
    case "PROS":
    case "CONS":
      return {
        "& li": { pl: 6 },
        "& li::before": {
          content: kind === "PROS" ? '"+"' : '"\\2013"',
          position: "absolute",
          left: "2px",
          top: 0,
          fontWeight: 900,
          fontSize: "lg",
          lineHeight: "1.6",
          color: accent,
        },
      };
    case "STEPS":
      return {
        "& ol": { counterReset: "nxstep" },
        "& ol > li": {
          counterIncrement: "nxstep",
          pl: 10,
          minH: "26px",
          mb: 3,
        },
        "& ol > li::before": {
          content: "counter(nxstep)",
          position: "absolute",
          left: 0,
          top: "0.1em",
          w: "26px",
          h: "26px",
          borderRadius: "full",
          bg: accent,
          color: "#12152a",
          fontWeight: 800,
          fontSize: "sm",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        "& ul li": diamond["& li"],
        "& ul li::before": diamond["& li::before"],
      };
    case "FACTS":
      return {
        "& ul": {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 2,
        },
        "& li": {
          mb: 0,
          px: 3.5,
          py: 2.5,
          borderRadius: "10px",
          bg: c.tCard,
          borderWidth: "1px",
          borderColor: c.tRule,
          color: c.heading,
          fontWeight: 600,
          lineHeight: "1.45",
        },
        "& [data-nxlabel]": {
          display: "block",
          fontSize: "2xs",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: accent,
          mb: 0.5,
        },
      };
    case "TIMELINE":
      return {
        "& li": { pl: 7, pb: 3, mb: 0 },
        "& li::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: "0.5em",
          w: "11px",
          h: "11px",
          borderRadius: "full",
          bg: accent,
          boxShadow: `0 0 0 3px ${accent}33`,
        },
        "& li::after": {
          content: '""',
          position: "absolute",
          left: "4.5px",
          top: "1.35em",
          bottom: "0.1em",
          w: "2px",
          bg: `${accent}40`,
        },
        "& li:last-child::after": { display: "none" },
        "& li:last-child": { pb: 0 },
        "& [data-nxlabel]": {
          display: "block",
          fontSize: "xs",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent,
        },
      };
    default:
      return diamond;
  }
}

// ---- the components map --------------------------------------------------------

export function blockComponents(c: Palette, tone: Tone) {
  const ink = (i: Ink) => INK[i][tone];

  /** Framed card with a left accent bar. */
  const Frame = ({
    accent,
    rail,
    css,
    children,
    as = "aside",
  }: {
    accent: string;
    rail?: boolean;
    css?: Record<string, unknown>;
    children: ReactNode;
    as?: "aside" | "details" | "section";
  }) => (
    <Box
      as={as}
      my={7}
      position="relative"
      overflow="hidden"
      borderRadius="14px"
      borderWidth="1px"
      borderColor={`${accent}45`}
      bg={`${accent}12`}
      pl={{ base: 5, md: 6 }}
      pr={{ base: 4, md: 6 }}
      py={4}
      fontSize="md"
      lineHeight="1.7"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        w: "4px",
        bgImage: rail ? c.tRail : undefined,
        bg: rail ? undefined : accent,
      }}
      // "&&" doubles the class so these list rules win over the host
      // renderer's own ul/ol/li styles (GuideMarkdown's numbered pills).
      css={{ "&&": mergeCss(bodyCss(c), css) }}
    >
      {children}
    </Box>
  );

  const Head = ({
    kind,
    accent,
    label,
    aside,
    mb = 2,
  }: {
    kind: BlockKind;
    accent: string;
    label?: string;
    aside?: string;
    mb?: number;
  }) => (
    <Flex align="center" gap={2.5} mb={mb} wrap="wrap">
      <Chip icon={KINDS[kind].icon} accent={accent} tone={tone} />
      <Label accent={accent}>{label || KINDS[kind].label}</Label>
      {aside ? (
        <Text as="span" fontSize="sm" color={c.caption}>
          {aside}
        </Text>
      ) : null}
    </Flex>
  );

  const Title = ({ children }: { children: ReactNode }) => (
    <Text
      fontWeight="700"
      fontSize="lg"
      color={c.heading}
      mb={1.5}
      lineHeight="1.4"
    >
      {children}
    </Text>
  );

  const Chevron = () => (
    <Box
      as="span"
      ml="auto"
      flex="0 0 auto"
      display="inline-flex"
      color={c.caption}
      transition="transform 0.2s ease"
      data-chevron
    >
      <FiChevronDown size={18} />
    </Box>
  );

  const Quote = ({ by, children }: { by: string; children: ReactNode }) => {
    const accent = ink("gold");
    return (
      <Box as="figure" my={9} pl={{ base: 5, md: 7 }} position="relative">
        <Box
          position="absolute"
          left={0}
          top={1}
          bottom={1}
          w="3px"
          borderRadius="full"
          bgImage={c.tRail}
        />
        <Text
          aria-hidden
          fontSize="6xl"
          lineHeight="0.6"
          h="28px"
          color={accent}
          fontWeight="800"
          fontFamily="Georgia, serif"
        >
          {"“"}
        </Text>
        <Box
          as="blockquote"
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.45"
          fontWeight="600"
          color={c.heading}
          letterSpacing="-0.01em"
          css={{ "& p": { mb: 2 }, "& p:last-child": { mb: 0 } }}
        >
          {children}
        </Box>
        {by ? (
          <Flex as="figcaption" align="center" gap={2.5} mt={4}>
            <Box w="22px" h="2px" bg={accent} />
            <Text
              fontSize="sm"
              fontWeight="700"
              letterSpacing="0.06em"
              textTransform="uppercase"
              color={c.caption}
            >
              {by}
            </Text>
          </Flex>
        ) : null}
      </Box>
    );
  };

  const Verdict = ({
    title,
    name,
    children,
  }: {
    title: string;
    name?: string;
    children: ReactNode;
  }) => {
    const accent = ink("gold");
    const m = title.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?\s*(.*)$/);
    const score = m ? Number(m[1]) : null;
    const outOf = m?.[2] ? Number(m[2]) : 10;
    const word = m ? m[3].trim() : title;
    const pct = score !== null ? Math.max(0, Math.min(1, score / outOf)) : 0;
    const R = 30;
    const L = 2 * Math.PI * R;
    return (
      <Frame accent={accent} rail css={listCss("VERDICT", accent, c)}>
        <Flex gap={{ base: 4, md: 5 }} align="flex-start">
          {score !== null ? (
            <Box position="relative" w="76px" h="76px" flex="0 0 auto" mt={1}>
              <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
                <circle
                  cx="38"
                  cy="38"
                  r={R}
                  fill="none"
                  stroke={`${accent}26`}
                  strokeWidth="7"
                />
                <circle
                  cx="38"
                  cy="38"
                  r={R}
                  fill="none"
                  stroke={accent}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${L * pct} ${L}`}
                  transform="rotate(-90 38 38)"
                />
              </svg>
              <Flex
                position="absolute"
                inset={0}
                direction="column"
                align="center"
                justify="center"
              >
                <Text
                  fontSize="xl"
                  fontWeight="800"
                  color={c.heading}
                  lineHeight="1"
                >
                  {m![1]}
                </Text>
                <Text fontSize="2xs" color={c.caption} mt={0.5}>
                  / {outOf}
                </Text>
              </Flex>
            </Box>
          ) : null}
          <Box flex="1" minW={0}>
            <Head
              kind="VERDICT"
              accent={accent}
              label={name || undefined}
              mb={1}
            />
            {word ? <Title>{word}</Title> : null}
            <Box>{children}</Box>
          </Box>
        </Flex>
      </Frame>
    );
  };

  const ReadNext = ({
    href,
    label,
    kicker,
    children,
  }: {
    href: string;
    label: string;
    kicker: string;
    children: ReactNode;
  }) => {
    const accent = ink("gold");
    const local = href.replace(/^https?:\/\/(www\.)?nexzyapp\.com/i, "") || "/";
    const internal = local.startsWith("/");
    const inner = (
      <Flex
        my={7}
        align="center"
        gap={4}
        px={{ base: 4, md: 5 }}
        py={4}
        borderRadius="14px"
        borderWidth="1px"
        borderColor={c.tBorder}
        bg={c.tFrame}
        transition="border-color 0.15s ease, transform 0.15s ease"
        _hover={{ borderColor: `${accent}80`, transform: "translateY(-1px)" }}
      >
        <Box flex="1" minW={0}>
          <Flex align="center" gap={2} mb={1}>
            <Box color={accent}>
              <FiBookOpen size={13} />
            </Box>
            <Label accent={accent}>{kicker}</Label>
          </Flex>
          <Text
            fontWeight="700"
            fontSize="lg"
            color={c.heading}
            lineHeight="1.35"
          >
            {label}
          </Text>
          {children ? (
            <Box
              fontSize="sm"
              color={c.caption}
              mt={1}
              css={{ "& p": { mb: 0 } }}
            >
              {children}
            </Box>
          ) : null}
        </Box>
        <Flex
          flex="0 0 auto"
          w="36px"
          h="36px"
          borderRadius="full"
          align="center"
          justify="center"
          bg={accent}
          color="#12152a"
        >
          <FiArrowRight size={18} />
        </Flex>
      </Flex>
    );
    return internal ? (
      <NextLink
        href={local}
        style={{ display: "block", textDecoration: "none" }}
      >
        {inner}
      </NextLink>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none" }}
      >
        {inner}
      </a>
    );
  };

  const disclosureCss = {
    "& summary": { listStyle: "none", cursor: "pointer" },
    "& summary::-webkit-details-marker": { display: "none" },
    "&[open] > summary [data-chevron]": { transform: "rotate(180deg)" },
  };

  const SOCIAL: Record<
    string,
    { name: string; icon: IconType; color: string }
  > = {
    x: {
      name: "X",
      icon: FaXTwitter,
      color: tone === "dark" ? "#ffffff" : "#111111",
    },
    bluesky: { name: "Bluesky", icon: FaBluesky, color: "#1185FE" },
    reddit: { name: "Reddit", icon: FaReddit, color: "#FF4500" },
    instagram: { name: "Instagram", icon: FaInstagram, color: "#E1306C" },
    threads: {
      name: "Threads",
      icon: FaThreads,
      color: tone === "dark" ? "#ffffff" : "#111111",
    },
  };

  return {
    nxblock: ({ children, ...rest }: P) => {
      const kind = str(rest["data-kind"]) as BlockKind;
      const title = str(rest["data-title"]);
      // [!KIND|Custom label] overrides the small label on any block.
      const name = str(rest["data-name"]);
      const k = KINDS[kind] ?? KINDS.NOTE;
      const accent = ink(k.ink);

      // PATCH / READ / COMPARE fall through to the plain card below when
      // their data is missing (no tagged lines, no link, < 2 images), so a
      // half-written block never renders as raw text or disappears.
      const patch =
        kind === "PATCH" ? json<PatchBoardData>(rest["data-patch"]) : null;
      if (patch?.items?.length) return <PatchBoard data={patch} />;
      if (kind === "QUOTE") return <Quote by={title}>{children}</Quote>;
      if (kind === "VERDICT")
        return (
          <Verdict title={title} name={name}>
            {children}
          </Verdict>
        );
      if (kind === "READ" && str(rest["data-href"]))
        return (
          <ReadNext
            href={str(rest["data-href"])}
            label={str(rest["data-label"])}
            kicker={name || "Read next"}
          >
            {children}
          </ReadNext>
        );
      if (kind === "COMPARE") {
        const imgs =
          json<{ src: string; alt: string }[]>(rest["data-images"]) ?? [];
        if (imgs.length >= 2) {
          const [l = "", r = ""] = title.split("|").map((s) => s.trim());
          return (
            <CompareSlider images={imgs} labels={[l, r]} border={c.tBorder} />
          );
        }
      }
      if (kind === "SPOILER")
        return (
          <Frame accent={accent} as="details" css={disclosureCss}>
            <Flex as="summary" align="center" gap={2.5}>
              <Chip icon={k.icon} accent={accent} tone={tone} />
              <Label accent={accent}>{name || "Spoiler"}</Label>
              <Text as="span" fontWeight="700" color={c.heading} fontSize="md">
                {title || "Tap to reveal"}
              </Text>
              <Chevron />
            </Flex>
            <Box mt={3}>{children}</Box>
          </Frame>
        );
      if (kind === "FAQ")
        return (
          <Frame
            accent={accent}
            as="section"
            css={{
              "& details": {
                borderTopWidth: "1px",
                borderColor: `${accent}30`,
                py: 3,
              },
              "& details:last-child": { pb: 0 },
              ...disclosureCss,
              "& details[open] > summary [data-chevron]": {
                transform: "rotate(180deg)",
              },
            }}
          >
            <Head
              kind="FAQ"
              accent={accent}
              label={name || title || undefined}
              mb={1}
            />
            {children}
          </Frame>
        );

      // UPDATE/CORRECTION: title is a timestamp shown beside the label.
      // PROS/CONS/STEPS/FACTS/TIMELINE: title replaces the label.
      // Everything else: title is a bold line under the label.
      const stamp = kind === "UPDATE" || kind === "CORRECTION";
      const asLabel = ["PROS", "CONS", "STEPS", "FACTS", "TIMELINE"].includes(
        kind,
      );
      const asTitle = !!title && !stamp && !asLabel;
      return (
        <Frame
          accent={accent}
          rail={kind === "KEY"}
          css={listCss(kind, accent, c)}
        >
          <Head
            kind={kind}
            accent={accent}
            label={name || (asLabel && title ? title : undefined)}
            aside={stamp ? title : undefined}
            mb={asTitle ? 1.5 : 2.5}
          />
          {asTitle ? <Title>{title}</Title> : null}
          <Box>{children}</Box>
        </Frame>
      );
    },

    nxpair: ({ children }: P) => (
      <Grid
        my={7}
        gap={4}
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        css={{ "& > aside": { my: 0 } }}
      >
        {children}
      </Grid>
    ),

    nxfaq: ({ children }: P) => <Box as="details">{children}</Box>,
    nxfaqq: ({ children }: P) => (
      <Flex
        as="summary"
        align="center"
        gap={3}
        fontWeight="700"
        color={c.heading}
        fontSize="md"
      >
        <Box flex="1">{children}</Box>
        <Chevron />
      </Flex>
    ),

    nxlabel: ({ children }: P) => (
      <Text as="span" data-nxlabel fontWeight="700" color={c.heading} mr={1}>
        {children}
      </Text>
    ),

    nxmedia: (rest: P) => {
      const e = json<Embed>(rest["data-embed"]);
      const caption = str(rest["data-caption"]);
      if (!e) return null;
      const cap = caption ? (
        <Text
          as="figcaption"
          fontSize="sm"
          color={c.caption}
          textAlign="center"
          mt={2}
        >
          {caption}
        </Text>
      ) : null;
      if (e.kind === "social") {
        const s = SOCIAL[e.platform];
        if (!s) return null;
        const Icon = s.icon;
        return (
          <Box as="figure" my={7}>
            <a
              href={e.url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              style={{ display: "block", textDecoration: "none" }}
            >
              <Flex
                align="center"
                gap={3.5}
                px={4}
                py={3.5}
                borderRadius="14px"
                borderWidth="1px"
                borderColor={c.tBorder}
                bg={c.tFrame}
                transition="border-color 0.15s ease"
                _hover={{ borderColor: `${s.color}88` }}
              >
                <Flex
                  flex="0 0 auto"
                  w="40px"
                  h="40px"
                  borderRadius="12px"
                  align="center"
                  justify="center"
                  bg={`${s.color}1f`}
                  color={s.color}
                >
                  <Icon size={20} />
                </Flex>
                <Box flex="1" minW={0}>
                  <Text
                    fontWeight="700"
                    color={c.heading}
                    fontSize="md"
                    lineHeight="1.3"
                  >
                    {s.name} post
                  </Text>
                  <Text fontSize="sm" color={c.caption} lineClamp={1}>
                    {e.handle}
                  </Text>
                </Box>
                <Flex
                  align="center"
                  gap={1}
                  fontSize="sm"
                  fontWeight="600"
                  color={c.link}
                  flex="0 0 auto"
                >
                  View post <FiArrowUpRight />
                </Flex>
              </Flex>
            </a>
            {cap}
          </Box>
        );
      }
      return (
        <Box
          as="figure"
          my={7}
          mx={e.portrait ? "auto" : undefined}
          maxW={e.portrait ? "340px" : undefined}
        >
          <Box
            position="relative"
            w="full"
            pt={e.portrait ? "177.78%" : "56.25%"}
            borderRadius="14px"
            overflow="hidden"
            bg="black"
            borderWidth="1px"
            borderColor={c.tBorder}
            boxShadow="0 10px 30px -18px rgba(0,0,0,0.6)"
          >
            <iframe
              src={e.src}
              title={caption || "Video"}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </Box>
          {cap}
        </Box>
      );
    },

    nxgallery: ({ children, ...rest }: P) => {
      const n = Number(str(rest["data-count"])) || 2;
      return (
        <Grid
          my={7}
          gap={3}
          templateColumns={{
            base: "1fr 1fr",
            md: `repeat(${Math.min(n, 3)}, 1fr)`,
          }}
          css={{
            "& figure": { my: 0 },
            // contain, never cover: screenshots keep their edges (HUD,
            // subtitles); mixed sizes letterbox on the dark frame.
            "& img": {
              aspectRatio: "16 / 10",
              objectFit: "contain",
              width: "100%",
              background: "rgba(0,0,0,0.35)",
            },
          }}
        >
          {children}
        </Grid>
      );
    },
  };
}

/** GFM table -> Nexzy "stat card" (see rehypeTableLabels for the phone cards). */
export function StatTable({
  c,
  children,
  stack,
}: {
  c: Palette;
  children: ReactNode;
  stack: boolean;
}) {
  return (
    <Box
      my={8}
      position="relative"
      bg={c.tFrame}
      borderWidth="1px"
      borderColor={c.tBorder}
      borderRadius="16px"
      overflow="hidden"
      boxShadow="0 10px 30px -18px rgba(0,0,0,0.6)"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        h: "3px",
        bgImage: c.tRail,
      }}
    >
      <Box overflowX="auto" pt="3px">
        <Box
          as="table"
          w="full"
          fontSize="md"
          lineHeight="1.5"
          borderCollapse="collapse"
          fontVariantNumeric="tabular-nums"
          css={{
            "& th": {
              px: 5,
              py: 3,
              textAlign: "left",
              fontSize: "xs",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: c.tLabel,
              bg: c.tHeadBg,
              borderBottomWidth: "1px",
              borderColor: c.tHeadRule,
              whiteSpace: "nowrap",
            },
            "& td": {
              px: 5,
              py: 3.5,
              verticalAlign: "top",
              borderBottomWidth: "1px",
              borderColor: c.tRule,
            },
            "& td:first-of-type": { color: c.tName, fontWeight: 600 },
            "& tbody tr:last-of-type td": { borderBottomWidth: 0 },
            "& tbody tr": { transition: "background 0.15s ease" },
            "& tbody tr:hover": { bg: c.tHover },
            "& td strong": { color: c.tName },
            ...(stack
              ? {
                  mdDown: {
                    display: "block",
                    "& thead": {
                      position: "absolute",
                      w: "1px",
                      h: "1px",
                      overflow: "hidden",
                      clip: "rect(0 0 0 0)",
                    },
                    "& tbody": { display: "block", p: 3 },
                    "& tbody tr": {
                      display: "block",
                      bg: c.tCard,
                      borderWidth: "1px",
                      borderColor: c.tBorder,
                      borderRadius: "12px",
                      overflow: "hidden",
                      mb: 3,
                    },
                    "& tbody tr:last-of-type": { mb: 0 },
                    "& tbody tr:hover": { bg: c.tCard },
                    "& td": {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 4,
                      px: 4,
                      py: 2.5,
                      textAlign: "right !important",
                    },
                    "& td::before": {
                      content: "attr(data-label)",
                      flexShrink: 0,
                      textAlign: "left",
                      fontSize: "2xs",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: c.tLabel,
                    },
                    "& td:first-of-type": {
                      display: "block",
                      textAlign: "left !important",
                      fontSize: "lg",
                      fontWeight: 700,
                      bg: c.tCardHead,
                    },
                    "& td:first-of-type::before": { content: "none" },
                    "& tbody tr:last-of-type td": { borderBottomWidth: "1px" },
                    "& tbody tr td:last-of-type": { borderBottomWidth: 0 },
                  },
                }
              : {}),
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
