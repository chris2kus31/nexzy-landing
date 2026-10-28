// Server-rendered mega hub sections (Phase 1). Everything here is plain HTML
// in the first response: question headings, a direct answer up top, sourced
// facts with dates, editions table and FAQ, so search engines and AI answer
// engines can read and quote it. Visual style follows the approved mock.
import NextLink from "next/link";
import NextImage from "next/image";
import { Badge, Box, HStack, Heading, Link, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  FACT_SECTIONS,
  sectionQuestion,
  type FactStatus,
  type HubEdition,
  type HubFact,
  type HubFaq,
} from "@/lib/hubs/types";
import type { GameHubItem } from "@/lib/blog/api";
import { getAuthorByName } from "@/lib/blog/authors";

export { HUB_TZ, fmtHubDate } from "@/lib/hubs/types";
import { fmtHubDate } from "@/lib/hubs/types";

const STATUS: Record<FactStatus, { label: string; palette: string; note: string }> = {
  confirmed: { label: "Confirmed", palette: "green", note: "Official source" },
  reported: { label: "Reported", palette: "blue", note: "Credible report, not official" },
  leaked: { label: "Leaked", palette: "orange", note: "Unverified, treat with care" },
};

export function HubPanel({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      as="section"
      id={id}
      aria-labelledby={`${id}-h`}
      bg="#1a1f3a"
      borderRadius="18px"
      p={{ base: 5, md: 6 }}
      scrollMarginTop="80px"
    >
      <HStack justify="space-between" align="baseline" flexWrap="wrap" gap={2} mb={4}>
        <Heading
          as="h2"
          id={`${id}-h`}
          fontFamily="heading"
          fontSize={{ base: "xl", md: "2xl" }}
          color="white"
        >
          {title}
        </Heading>
        {aside && (
          <Text fontSize="sm" color="#9aa3bf">
            {aside}
          </Text>
        )}
      </HStack>
      {children}
    </Box>
  );
}

/** The short version: a 30 to 45 word direct answer, dated and bylined. */
export function ShortVersion({
  gameName,
  summary,
  updatedAt,
  editor,
}: {
  gameName: string;
  summary: string;
  updatedAt: string | null;
  editor: string | null;
}) {
  const persona = getAuthorByName(editor);
  return (
    <Box
      as="section"
      aria-label={`${gameName}: the short version`}
      borderLeft="3px solid #FFD700"
      bg="#1a1f3a"
      borderRadius="0 14px 14px 0"
      p={{ base: 4, md: 5 }}
    >
      <Text fontSize="xs" fontWeight="700" letterSpacing="0.08em" color="#FFD700" mb={2}>
        THE SHORT VERSION
      </Text>
      <Text color="white" fontSize={{ base: "md", md: "lg" }} lineHeight="1.6">
        {summary}
      </Text>
      <HStack gap={2} mt={3} fontSize="sm" color="#9aa3bf" flexWrap="wrap">
        {persona && (
          <Text>
            By{" "}
            <Link asChild color="nexzy.lightBlue">
              <NextLink href={`/author/${persona.slug}`} rel="author">
                {persona.name}
              </NextLink>
            </Link>
          </Text>
        )}
        {persona && updatedAt && <Text>·</Text>}
        {updatedAt && (
          <Text>
            Updated <time dateTime={updatedAt}>{fmtHubDate(updatedAt, true)}</time>
          </Text>
        )}
      </HStack>
    </Box>
  );
}

function FactCard({ fact }: { fact: HubFact }) {
  const st = STATUS[fact.status] ?? STATUS.reported;
  return (
    <Box
      as="li"
      listStyleType="none"
      bg="#11152b"
      borderRadius="12px"
      p={4}
      borderLeft={fact.status === "leaked" ? "2px solid" : undefined}
      borderColor="orange.400"
    >
      <HStack justify="space-between" align="start" gap={2}>
        <Text fontSize="xs" fontWeight="700" letterSpacing="0.06em" color="#FFD700">
          {fact.label.toUpperCase()}
        </Text>
        <Badge colorPalette={st.palette} variant="subtle" title={st.note} flexShrink={0}>
          {st.label}
        </Badge>
      </HStack>
      <Text mt={2} color="white" fontSize="md" lineHeight="1.55">
        {fact.value}
      </Text>
      <HStack mt={2} gap={2} fontSize="xs" color="#9aa3bf" flexWrap="wrap">
        <Text>
          Source:{" "}
          <Link href={fact.sourceUrl} target="_blank" rel="noopener" color="#4DA3FF">
            {fact.sourceName}
          </Link>
        </Text>
        {fact.updatedOn && (
          <>
            <Text>·</Text>
            <time dateTime={fact.updatedOn}>
              {fmtHubDate(`${fact.updatedOn}T12:00:00Z`)}
            </time>
          </>
        )}
      </HStack>
    </Box>
  );
}

/** Everything we know: facts grouped under the questions people ask. */
export function EverythingWeKnow({
  gameName,
  facts,
  updatedAt,
}: {
  gameName: string;
  facts: HubFact[];
  updatedAt: string | null;
}) {
  const groups = FACT_SECTIONS.map((s) => ({
    section: s,
    items: facts.filter((f) => f.section === s),
  })).filter((g) => g.items.length > 0);
  if (!groups.length) return null;
  return (
    <HubPanel
      id="everything-we-know"
      title={`${gameName}: everything we know`}
      aside={
        updatedAt ? (
          <>
            Updated <time dateTime={updatedAt}>{fmtHubDate(updatedAt, true)}</time> ·
            every fact sourced
          </>
        ) : (
          "Every fact sourced"
        )
      }
    >
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
        gap={6}
      >
        {groups.map((g) => (
          <Box key={g.section} gridColumn={g.items.length > 2 ? { md: "span 2" } : undefined}>
            <Heading as="h3" fontSize="md" color="#EDF2F7" mb={3} fontFamily="heading">
              {sectionQuestion(g.section, gameName)}
            </Heading>
            <Box
              as="ul"
              m={0}
              p={0}
              display="grid"
              gridTemplateColumns={{
                base: "1fr",
                md: g.items.length > 2 ? "repeat(2, minmax(0, 1fr))" : "1fr",
              }}
              gap={3}
            >
              {g.items.map((f) => (
                <FactCard key={f.id} fact={f} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Text fontSize="xs" color="#9aa3bf" mt={5}>
        Confirmed = from {gameName}&apos;s publisher or platform holder. Reported = a
        credible outlet, not yet official. Leaked = unverified; we never show leaked
        footage.
      </Text>
    </HubPanel>
  );
}

function money(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

const cell = { padding: "12px 16px 12px 0", verticalAlign: "top" } as const;

export function EditionsTable({
  gameName,
  editions,
}: {
  gameName: string;
  editions: HubEdition[];
}) {
  if (!editions.length) return null;
  return (
    <HubPanel id="editions" title={`${gameName} editions and price`}>
      <Box overflowX="auto">
        {/* Plain HTML table: this is a server component, and Chakra's
            `chakra.*` factory is not available on the server. */}
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "#9aa3bf", textAlign: "left" }}>
              <th scope="col" style={{ ...cell, fontWeight: 600 }}>Edition</th>
              <th scope="col" style={{ ...cell, fontWeight: 600 }}>Price</th>
              <th scope="col" style={{ ...cell, fontWeight: 600, paddingRight: 0 }}>
                What&apos;s included
              </th>
            </tr>
          </thead>
          <tbody>
            {editions.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <th scope="row" style={{ ...cell, color: "#fff", fontWeight: 600, textAlign: "left" }}>
                  {e.url ? (
                    <Link href={e.url} target="_blank" rel="noopener sponsored" color="white">
                      {e.name}
                    </Link>
                  ) : (
                    e.name
                  )}
                </th>
                <td style={{ ...cell, color: "#FFD700", whiteSpace: "nowrap", fontFamily: "var(--chakra-fonts-title)" }}>
                  {e.price != null ? money(e.price, e.currency) : "Not announced"}
                </td>
                <td style={{ ...cell, color: "#c7cde0", paddingRight: 0 }}>
                  {e.includes.length ? e.includes.join(" · ") : "Base game"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </HubPanel>
  );
}

export function HubFaqList({
  gameName,
  faqs,
}: {
  gameName: string;
  faqs: HubFaq[];
}) {
  if (!faqs.length) return null;
  return (
    <HubPanel id="faq" title={`${gameName} FAQ`}>
      <Box display="flex" flexDirection="column" gap={5}>
        {faqs.map((f) => (
          <Box key={f.id}>
            <Heading as="h3" fontSize="md" color="white" mb={1} fontFamily="heading">
              {f.q}
            </Heading>
            <Text color="#c7cde0" lineHeight="1.7" whiteSpace="pre-line">
              {f.a}
            </Text>
          </Box>
        ))}
      </Box>
    </HubPanel>
  );
}

export function LatestNews({
  gameName,
  items,
}: {
  gameName: string;
  items: GameHubItem[];
}) {
  if (!items.length) return null;
  return (
    <HubPanel id="latest" title={`Latest ${gameName} news`}>
      <Box as="ul" m={0} p={0} display="flex" flexDirection="column" gap={3}>
        {items.map((it) => (
          <Box as="li" key={it.slug} listStyleType="none">
            <NextLink href={it.path} style={{ display: "block" }}>
              <HStack
                gap={4}
                bg="#11152b"
                borderRadius="12px"
                p={3}
                _hover={{ bg: "#161b36" }}
                transition="background 0.15s"
              >
                {it.heroImageUrl && (
                  <Box position="relative" w="96px" h="54px" flexShrink={0} borderRadius="8px" overflow="hidden">
                    <NextImage src={it.heroImageUrl} alt="" fill sizes="96px" style={{ objectFit: "cover" }} />
                  </Box>
                )}
                <Box minW={0}>
                  <Text color="white" fontWeight="600" lineClamp={2}>
                    {it.title}
                  </Text>
                  {it.publishedAt && (
                    <Text fontSize="xs" color="#9aa3bf" mt={1}>
                      <time dateTime={it.publishedAt}>{fmtHubDate(it.publishedAt)}</time>
                    </Text>
                  )}
                </Box>
              </HStack>
            </NextLink>
          </Box>
        ))}
      </Box>
    </HubPanel>
  );
}
