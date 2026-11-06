// Small building blocks for guide content: safe Markdown, field values by
// kind, type chip, unconfirmed badge and the entry card. No hooks, so they
// render on the server (crawlable pages) and inside client components.
// Unknown field kinds render nothing (a new kind can never break a page).
import NextLink from "next/link";
import NextImage from "next/image";
import type { ReactNode } from "react";
import { FiHelpCircle } from "react-icons/fi";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import GuideVideo from "@/components/games/guide/GuideVideo";
import {
  entryPath,
  typeOf,
  type HubCard,
  type HubFieldDef,
  type HubImage,
  type HubLinkRef,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";

export const G = {
  panel: "#1a1f3a",
  card: "#11152b",
  line: "rgba(255,255,255,0.12)",
  muted: "#9aa3bf",
  text: "#EDF2F7",
  gold: "#FFD700",
  ink: "#0b0e1d",
  warn: "#FFB86B",
};

// ───────────────────────── Markdown (safe subset) ─────────────────────────
// Headings (#, ##, ###), **bold**, *italic*, links to https:// or
// to our own pages (/games/...), "- " bullet lists and "1. " numbered lists.
// Everything renders as React text, never HTML, so nothing can inject markup.

const INLINE_RE =
  /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\((?:https:\/\/|\/(?![/\\]))[^)\s\\]*\))/g;

function inline(s: string, k: string): ReactNode[] {
  return s.split(INLINE_RE).map((part, i) => {
    const key = `${k}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={key}>{part.slice(1, -1)}</em>;
    const m = /^\[([^\]]+)\]\(((?:https:\/\/|\/(?![/\\]))[^)\s\\]*)\)$/.exec(part);
    if (m) {
      // "/x" stays on our site; "//host" and "/\host" (which browsers read
      // as another site) never match the pattern above.
      const internal = m[2].startsWith("/") && !/^\/[/\\]/.test(m[2]);
      if (internal)
        return (
          <NextLink
            key={key}
            href={m[2]}
            style={{ color: G.gold, textDecoration: "underline" }}
          >
            {m[1]}
          </NextLink>
        );
      if (m[2].startsWith("https://"))
        return (
          <a
            key={key}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{ color: G.gold, textDecoration: "underline" }}
          >
            {m[1]}
          </a>
        );
      return m[1];
    }
    return part;
  });
}

export function GuideMarkdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <Box color={G.text} lineHeight="1.7" fontSize="md">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        const h = /^(#{1,3})\s+(.+)$/.exec(lines[0]);
        if (h && lines.length === 1) {
          const level = h[1].length;
          return (
            <Text
              key={i}
              as={level === 1 ? "h2" : level === 2 ? "h3" : "h4"}
              fontWeight="800"
              fontSize={level === 1 ? "xl" : level === 2 ? "lg" : "md"}
              color="white"
              mt={i ? 5 : 0}
              mb={2}
            >
              {inline(h[2], `${i}`)}
            </Text>
          );
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
          return (
            <Box as="ul" key={i} pl={5} mb={3} style={{ listStyle: "disc" }}>
              {lines.map((l, j) => (
                <li key={j}>
                  {inline(l.replace(/^\s*[-*]\s+/, ""), `${i}-${j}`)}
                </li>
              ))}
            </Box>
          );
        if (lines.every((l) => /^\s*\d{1,3}[.)]\s+/.test(l)))
          return (
            <Box as="ol" key={i} pl={6} mb={3} style={{ listStyle: "decimal" }}>
              {lines.map((l, j) => (
                <li key={j}>
                  {inline(l.replace(/^\s*\d{1,3}[.)]\s+/, ""), `${i}-${j}`)}
                </li>
              ))}
            </Box>
          );
        // A heading line followed by text in the same block.
        const head = h ? lines.shift()! : null;
        return (
          <Box key={i}>
            {head && h && (
              <Text
                as={h[1].length === 1 ? "h2" : h[1].length === 2 ? "h3" : "h4"}
                fontWeight="800"
                fontSize={h[1].length === 1 ? "xl" : h[1].length === 2 ? "lg" : "md"}
                color="white"
                mt={i ? 5 : 0}
                mb={2}
              >
                {inline(h[2], `${i}h`)}
              </Text>
            )}
            <Text mb={3}>
              {lines.map((l, j) => (
                <span key={j}>
                  {inline(l, `${i}-${j}`)}
                  {j < lines.length - 1 && <br />}
                </span>
              ))}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ───────────────────────── chips ─────────────────────────

export function TypeChip({
  config,
  type,
}: {
  config: HubTemplateConfig;
  type: string;
}) {
  const t = typeOf(config, type);
  if (!t) return null;
  return (
    <HStack gap={1.5} display="inline-flex">
      <Box w="9px" h="9px" borderRadius="full" bg={t.color} flexShrink={0} />
      <Text
        fontSize="xs"
        fontWeight="700"
        color={G.muted}
        textTransform="uppercase"
        letterSpacing="0.06em"
      >
        {t.label}
      </Text>
    </HStack>
  );
}

export function UnconfirmedBadge({ label }: { label: string }) {
  return (
    <Text
      as="span"
      fontSize="xs"
      color={G.warn}
      border="1px dashed"
      borderColor="rgba(255,184,107,0.6)"
      borderRadius="6px"
      px={1.5}
      py={0.5}
      display="inline-block"
    >
      {label}
    </Text>
  );
}

// ───────────────────────── field values ─────────────────────────

const isImage = (v: unknown): v is HubImage =>
  !!v &&
  typeof v === "object" &&
  typeof (v as { url?: unknown }).url === "string" &&
  (v as { url: string }).url.startsWith("https://");

const optLabel = (fd: HubFieldDef, key: unknown) =>
  typeof key === "string"
    ? (fd.options?.find((o) => o.key === key)?.label ?? null)
    : null;

function Photo({ img, h = 200 }: { img: HubImage; h?: number }) {
  return (
    <Box
      position="relative"
      w="100%"
      h={`${h}px`}
      borderRadius="10px"
      overflow="hidden"
      bg={G.card}
    >
      <NextImage
        src={img.url}
        alt={img.alt ?? ""}
        fill
        sizes="(max-width: 768px) 100vw, 720px"
        style={{ objectFit: "cover" }}
      />
    </Box>
  );
}

/** One field's value, drawn by its kind. Returns null for empty/unknown. */
export function FieldValue({
  field,
  value,
  gameSlug,
  config,
}: {
  field: HubFieldDef;
  value: unknown;
  gameSlug: string;
  config: HubTemplateConfig;
}): ReactNode {
  if (value == null || value === "") return null;
  switch (field.kind) {
    case "text":
      return typeof value === "string" ? (
        <Text color={G.text}>{value}</Text>
      ) : null;
    case "longtext":
      return typeof value === "string" ? <GuideMarkdown text={value} /> : null;
    case "number":
      return typeof value === "number" ? (
        <Text color={G.text}>{value.toLocaleString("en-US")}</Text>
      ) : null;
    case "boolean":
      return typeof value === "boolean" ? (
        <Text color={G.text}>{value ? "Yes" : "No"}</Text>
      ) : null;
    case "select": {
      const l = optLabel(field, value);
      return l ? <Text color={G.text}>{l}</Text> : null;
    }
    case "multiselect": {
      const labels = Array.isArray(value)
        ? value.map((v) => optLabel(field, v)).filter(Boolean)
        : [];
      return labels.length ? (
        <Flex gap={1.5} wrap="wrap">
          {labels.map((l) => (
            <Text
              key={l}
              fontSize="sm"
              color={G.text}
              bg={G.card}
              border="1px solid"
              borderColor={G.line}
              borderRadius="999px"
              px={2.5}
              py={0.5}
            >
              {l}
            </Text>
          ))}
        </Flex>
      ) : null;
    }
    case "image":
      return isImage(value) ? <Photo img={value} /> : null;
    case "gallery": {
      // Stored values are checked again here: a template change can leave a
      // value of another shape, and a page must never crash on it.
      const imgs = Array.isArray(value) ? value.filter(isImage) : [];
      return imgs.length ? (
        <Flex gap={2} overflowX="auto" pb={1}>
          {imgs.map((img) => (
            <Box key={img.url} minW="240px" w="240px">
              <Photo img={img} h={150} />
            </Box>
          ))}
        </Flex>
      ) : null;
    }
    case "video":
      return typeof value === "string" && value.startsWith("https://") ? (
        <Box maxW="720px">
          <GuideVideo url={value} title={field.label} />
        </Box>
      ) : null;
    case "url":
      return typeof value === "string" && value.startsWith("https://") ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{ color: G.gold, textDecoration: "underline" }}
        >
          {value.replace(/^https:\/\/(www\.)?/, "").slice(0, 60)}
        </a>
      ) : null;
    case "entries": {
      const refs = Array.isArray(value)
        ? (value as HubLinkRef[]).filter(
            (r) => r && typeof r === "object" && "slug" in r,
          )
        : [];
      return refs.length ? (
        <LinkChips refs={refs} gameSlug={gameSlug} config={config} />
      ) : null;
    }
    default:
      return null;
  }
}

/** True when FieldValue would draw something for this value, so cards and
 *  entry pages never show a field label with nothing under it. */
export function hasFieldValue(field: HubFieldDef, value: unknown): boolean {
  if (value == null || value === "") return false;
  switch (field.kind) {
    case "text":
    case "longtext":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "select":
      return !!optLabel(field, value);
    case "multiselect":
      return Array.isArray(value) && value.some((v) => optLabel(field, v));
    case "image":
      return isImage(value);
    case "gallery":
      return Array.isArray(value) && value.some(isImage);
    case "video":
    case "url":
      return typeof value === "string" && value.startsWith("https://");
    case "entries":
      return (
        Array.isArray(value) &&
        value.some((r) => r && typeof r === "object" && "slug" in r)
      );
    default:
      return false;
  }
}

/** Markdown markers stripped for one-line card snippets (cards are too
 *  small for real formatting; readers must not see literal ** or #). */
export function plainSnippet(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function LinkChips({
  refs,
  gameSlug,
  config,
}: {
  refs: HubLinkRef[];
  gameSlug: string;
  config: HubTemplateConfig;
}) {
  return (
    <Flex gap={1.5} wrap="wrap">
      {refs.map((r) => {
        const t = typeOf(config, r.type);
        const chip = (
          <HStack
            gap={1.5}
            bg={G.card}
            border="1px solid"
            borderColor={G.line}
            borderRadius="999px"
            px={2.5}
            py={1}
          >
            <Box w="8px" h="8px" borderRadius="full" bg={t?.color ?? G.muted} />
            <Text fontSize="sm" color={G.text}>
              {r.title}
            </Text>
          </HStack>
        );
        return t?.page ? (
          <NextLink key={r.id} href={entryPath(gameSlug, r.type, r.slug)}>
            {chip}
          </NextLink>
        ) : (
          <Box key={r.id}>{chip}</Box>
        );
      })}
    </Flex>
  );
}

// ───────────────────────── card ─────────────────────────

export function GuideCard({
  card,
  config,
  gameSlug,
  compact = false,
  minimal = false,
  right,
}: {
  card: HubCard;
  config: HubTemplateConfig;
  gameSlug: string;
  /** No image (rows). */
  compact?: boolean;
  /** Title only (short lists). */
  minimal?: boolean;
  right?: ReactNode;
}) {
  const t = typeOf(config, card.type);
  // Players don't fit on a small card; videos play on the entry page.
  const fields = (t?.fields ?? []).filter(
    (f) =>
      f.onCard && f.kind !== "video" && hasFieldValue(f, card.fields[f.key]),
  );
  const title = t?.page ? (
    <NextLink href={entryPath(gameSlug, card.type, card.slug)}>
      <Text
        fontWeight="700"
        color="white"
        lineClamp={2}
        _hover={{ textDecoration: "underline" }}
      >
        {card.title}
      </Text>
    </NextLink>
  ) : (
    <Text fontWeight="700" color="white" lineClamp={2}>
      {card.title}
    </Text>
  );
  return (
    <Box
      bg={G.card}
      borderRadius="12px"
      border="1px solid"
      borderColor={G.line}
      overflow="hidden"
      h="100%"
    >
      {!compact && card.image && (
        <Box position="relative" w="100%" h="140px">
          <NextImage
            src={card.image.url}
            alt={card.image.alt ?? card.title}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            style={{ objectFit: "cover" }}
          />
        </Box>
      )}
      <Flex p={compact ? 3 : 4} gap={3} align="flex-start">
        <Box flex="1" minW={0}>
          <HStack gap={2} mb={1} wrap="wrap">
            <TypeChip config={config} type={card.type} />
            {card.status === "unconfirmed" && (
              // Cards stay quiet: a small mark with the template's label as
              // its name; the full label shows on the entry page and panel.
              <Box
                as="span"
                display="inline-flex"
                color={G.warn}
                role="img"
                title={config.features.unconfirmedLabel}
                aria-label={config.features.unconfirmedLabel}
              >
                <FiHelpCircle size={13} />
              </Box>
            )}
          </HStack>
          {title}
          {!minimal && card.summary && (
            <Text fontSize="sm" color={G.muted} mt={1} lineClamp={2}>
              {card.summary}
            </Text>
          )}
          {!minimal &&
            fields.map((f) => (
              <Box key={f.key} mt={2} fontSize="sm">
                <Text fontSize="xs" color={G.muted} fontWeight="600">
                  {f.label}
                </Text>
                {f.kind === "longtext" &&
                typeof card.fields[f.key] === "string" ? (
                  <Text color={G.text} lineClamp={3}>
                    {plainSnippet(String(card.fields[f.key]))}
                  </Text>
                ) : (
                  <FieldValue
                    field={f}
                    value={card.fields[f.key]}
                    gameSlug={gameSlug}
                    config={config}
                  />
                )}
              </Box>
            ))}
        </Box>
        {right}
      </Flex>
    </Box>
  );
}
