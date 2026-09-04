"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  Link,
  Input,
  Textarea,
} from "@chakra-ui/react";
import {
  getLeads,
  runDesk,
  runEmailIngest,
  sendLeadDigest,
  analyzeLead,
  writeLead,
  writeLeadReview,
  skipLead,
  quickAnnounceFromLead,
  getWriterNames,
  type Lead,
} from "@/lib/admin/client";
import { BEATS, beatLabel } from "@/lib/blog/beats";
import { youtubeId, isYoutubeShort } from "@/lib/blog/youtube";
import Paginated from "@/components/admin/Paginated";

function timeAgo(iso: string | null): string {
  if (!iso) return "unknown";
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  const hrs = secs / 3600;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Trend badge color ramps up with heat. */
function trendColor(score: number): string {
  if (score >= 75) return "red.400";
  if (score >= 50) return "orange.400";
  if (score >= 30) return "yellow.400";
  return "whiteAlpha.400";
}

const LEAD_AUTHORS = ["Chuy", "Eli", "Leslie"];

function LeadCard({
  lead,
  onWrite,
  onSkip,
  onQuickAnnounce,
  busy,
  authors,
  isOwner,
}: {
  lead: Lead;
  onWrite: (
    id: string,
    author: string,
    generateImage: boolean,
    treatment: "news" | "review",
    opts?: { angle?: string; take?: string; sourceText?: string },
  ) => void;
  onSkip: (id: string) => void;
  onQuickAnnounce: (
    id: string,
    author: string,
    context: string,
    xSteer: string,
    threadsSteer: string,
  ) => void;
  busy: boolean;
  authors: string[];
  isOwner: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const [author, setAuthor] = useState(lead.suggestedAuthor || "Chuy");
  // AI hero image is OPT-IN: default is no image (checking the box spends image
  // tokens). The positive `generateImage` flag goes straight to the API, which
  // also defaults to "no image" — a forgotten click can't silently spend tokens.
  const [genImage, setGenImage] = useState(false);
  const [treatment, setTreatment] = useState<"news" | "review">(
    lead.suggestedTreatment || "news",
  );
  // Phase 2 — the author's angle + raw take, entered here at the lead.
  const [showTake, setShowTake] = useState(false);
  const [take, setTake] = useState("");
  const [angle, setAngle] = useState("");
  // ⚡ Quick announce — skip the article entirely, fire an X + Threads take
  // straight off this lead. Optional per-platform steer, owner-only.
  const [showQuick, setShowQuick] = useState(false);
  const [quickContext, setQuickContext] = useState("");
  const [xSteer, setXSteer] = useState("");
  const [threadsSteer, setThreadsSteer] = useState("");
  // Email leads only: pasted press-release / article text (the source page is
  // behind a login, so it can't be fetched). Becomes the lead's facts so the
  // writer + editor work from real content. Kept SEPARATE from the take.
  const isEmailLead = lead.origin === "email";
  const [sourceText, setSourceText] = useState("");
  // Whether to show the manual "paste source text" box. The backend computes this
  // (email + page-monitor + the Nintendo/EA opt-out publishers we never auto-read)
  // and returns it as `needsSourcePaste`, so the rule lives in ONE place and the
  // opt-out host list is never duplicated here. Falls back to email-only if an
  // older API response doesn't carry the flag yet.
  const needsPasteBox = lead.needsSourcePaste ?? isEmailLead;
  // Pre-load the angle map if this lead was already analyzed (it's saved on the
  // brief + returned in the list), so a refresh doesn't hide it behind the button.
  const [analysis, setAnalysis] = useState<Lead | null>(
    lead.differentiation ? lead : null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const runAnalyze = async () => {
    setAnalyzing(true);
    try {
      setAnalysis(await analyzeLead(lead.id));
    } catch {
      // best-effort — leave the angle map hidden on failure
    } finally {
      setAnalyzing(false);
    }
  };
  const hot = lead.trendScore >= 60;
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={hot ? "orange.400" : "whiteAlpha.200"}
      borderRadius="xl"
      p={4}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "flex-start" }}
        gap={4}
      >
        <Box flex={1} minW={0}>
          <HStack gap={2} mb={1} wrap="wrap">
            <Box
              px={2}
              py="1px"
              borderRadius="md"
              bg="whiteAlpha.100"
              color="nexzy.gray.100"
              fontSize="xs"
              fontWeight="600"
            >
              {beatLabel(lead.beat)}
            </Box>
            {(lead.origin === "email" ||
              (lead.sources ?? []).some((s) => s.tier === "primary")) && (
              <Box
                px={2}
                py="1px"
                borderRadius="md"
                bg="#00E5D0"
                color="#062b28"
                fontSize="xs"
                fontWeight="800"
                title="Straight from the publisher (first-party) — the origin of the news, before the outlets rewrote it"
              >
                🎯 Primary source
              </Box>
            )}
            {lead.ownable === "none" && (
              <Box
                px={2}
                py="1px"
                borderRadius="md"
                bg="whiteAlpha.100"
                color="whiteAlpha.700"
                fontSize="xs"
                fontWeight="600"
                title="Commodity beat — write for social / noindex"
              >
                Commodity
              </Box>
            )}
            {lead.ownable && lead.ownable !== "none" && (
              <Box
                px={2}
                py="1px"
                borderRadius="md"
                bg="green.600"
                color="white"
                fontSize="xs"
                fontWeight="700"
                title="Nexzy can add original value here"
              >
                Ownable
              </Box>
            )}
            {lead.suggestedTreatment === "review" && (
              <Box
                px={2}
                py="1px"
                borderRadius="md"
                bg="purple.500"
                color="white"
                fontSize="xs"
                fontWeight="700"
                title="The desk thinks this reads better as a review — you can switch it back to news below."
              >
                🎬 Review?
              </Box>
            )}
            <Text
              color={trendColor(lead.trendScore)}
              fontSize="xs"
              fontWeight="700"
            >
              {hot ? "🔥 " : ""}
              {lead.trendScore} trend
            </Text>
            <Text color="nexzy.gray.100" fontSize="xs">
              {lead.sourceCount} outlet{lead.sourceCount === 1 ? "" : "s"} ·{" "}
              {timeAgo(lead.latestSourceDate)}
            </Text>
          </HStack>
          <Text color="nexzy.white" fontWeight="700" lineHeight="1.25">
            {lead.headline || lead.workingTitle}
          </Text>
          {lead.whyItMatters && (
            <Text color="nexzy.gray.100" fontSize="sm" mt={1}>
              {lead.whyItMatters}
            </Text>
          )}
          {(() => {
            const vid = youtubeId(lead.youtubeUrl);
            if (!vid) return null;
            const short = isYoutubeShort(lead.youtubeUrl);
            return (
              <Link
                href={
                  lead.youtubeUrl || `https://www.youtube.com/watch?v=${vid}`
                }
                target="_blank"
                rel="noopener noreferrer"
                mt={2}
                display="inline-flex"
                alignItems="center"
                gap={2}
                _hover={{ textDecoration: "none", opacity: 0.9 }}
              >
                <Box
                  position="relative"
                  w={short ? "48px" : "120px"}
                  h="68px"
                  flexShrink={0}
                  borderRadius="md"
                  overflow="hidden"
                  bg="black"
                >
                  <img
                    src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`}
                    alt="Trending video"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <Flex
                    position="absolute"
                    inset={0}
                    align="center"
                    justify="center"
                  >
                    <Box
                      w="26px"
                      h="18px"
                      borderRadius="4px"
                      bg="#FF0000"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="10px"
                    >
                      ▶
                    </Box>
                  </Flex>
                </Box>
                <Text color="nexzy.lightBlue" fontSize="xs" fontWeight="600">
                  🎬 {short ? "Trending Short" : "Trending video"}
                </Text>
              </Link>
            );
          })()}
          {(() => {
            const all = lead.sources ?? [];
            if (all.length === 0) return null;
            const primary = all.filter((s) => s.tier === "primary");
            const reporting = all.filter((s) => s.tier !== "primary");
            return (
              <Box mt={2}>
                {primary.length > 0 && (
                  <HStack gap={2} align="center" wrap="wrap" mb={1}>
                    <Text color="#00E5D0" fontSize="xs" fontWeight="700">
                      Straight from the source:
                    </Text>
                    {primary.map((s, i) =>
                      s.url ? (
                        <Link
                          key={i}
                          href={s.url}
                          color="nexzy.lightBlue"
                          fontSize="xs"
                          fontWeight="600"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.name}
                        </Link>
                      ) : (
                        <Text
                          key={i}
                          color="nexzy.white"
                          fontSize="xs"
                          fontWeight="600"
                        >
                          {s.name}
                        </Text>
                      ),
                    )}
                  </HStack>
                )}
                {reporting.length > 0 && (
                  <>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="nexzy.lightBlue"
                      px={0}
                      _hover={{
                        bg: "transparent",
                        textDecoration: "underline",
                      }}
                      onClick={() => setShowSources((s) => !s)}
                    >
                      {showSources
                        ? "Hide sources"
                        : `Also reported by (${reporting.length})`}
                    </Button>
                    {showSources && (
                      <VStack align="stretch" gap={1} mt={1}>
                        {reporting.map((s, i) => (
                          <Link
                            key={i}
                            href={s.url}
                            color="nexzy.lightBlue"
                            fontSize="xs"
                            lineClamp={1}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {s.name}
                          </Link>
                        ))}
                      </VStack>
                    )}
                  </>
                )}
              </Box>
            );
          })()}
        </Box>
        <VStack
          gap={2}
          align="stretch"
          w={{ base: "full", md: "340px" }}
          flexShrink={0}
        >
          {/* News ⇄ Review — pre-set to the desk's suggestion; the Write button
              writes against whatever is selected here. */}
          <HStack gap={1}>
            {(["news", "review"] as const).map((t) => {
              const active = treatment === t;
              const accent = t === "review" ? "purple.500" : "nexzy.blue";
              return (
                <Box
                  as="button"
                  key={t}
                  onClick={() => setTreatment(t)}
                  flex={1}
                  px={2}
                  py="3px"
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="700"
                  textTransform="capitalize"
                  borderWidth="1px"
                  bg={active ? accent : "transparent"}
                  color={active ? "white" : "nexzy.gray.100"}
                  borderColor={active ? accent : "whiteAlpha.300"}
                >
                  {t}
                  {lead.suggestedTreatment === t ? " ★" : ""}
                </Box>
              );
            })}
          </HStack>
          <Box>
            <Text color="nexzy.gray.100" fontSize="10px" mb={1}>
              Write as{" "}
              {lead.suggestedAuthor ? (
                <Text as="span" color="nexzy.lightBlue" fontWeight="700">
                  · {lead.suggestedAuthor} suggested ★
                </Text>
              ) : null}
            </Text>
            <HStack gap={1}>
              {authors.map((a) => {
                const active = author === a;
                return (
                  <Box
                    as="button"
                    key={a}
                    onClick={() => setAuthor(a)}
                    flex={1}
                    px={2}
                    py="3px"
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="600"
                    borderWidth="1px"
                    bg={active ? "nexzy.blue" : "transparent"}
                    color={active ? "white" : "nexzy.gray.100"}
                    borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                  >
                    {a}
                    {lead.suggestedAuthor === a ? " ★" : ""}
                  </Box>
                );
              })}
            </HStack>
          </Box>
          <Box
            as="button"
            onClick={() => setGenImage((v) => !v)}
            px={2}
            py="3px"
            borderRadius="md"
            fontSize="11px"
            fontWeight="600"
            borderWidth="1px"
            bg={genImage ? "nexzy.blue" : "transparent"}
            color={genImage ? "white" : "nexzy.gray.100"}
            borderColor={genImage ? "nexzy.blue" : "whiteAlpha.300"}
            title="Generate an AI hero image (spends image tokens) — off by default"
          >
            {genImage ? "☑" : "☐"} Generate AI image
          </Box>
          <Box
            as="button"
            onClick={() => setShowTake((v) => !v)}
            w="full"
            textAlign="center"
            fontSize="xs"
            fontWeight="600"
            color="#FFD866"
            borderWidth="1px"
            borderColor="rgba(255,216,102,0.35)"
            borderRadius="md"
            py="6px"
            _hover={{ bg: "rgba(255,216,102,0.08)" }}
          >
            {showTake
              ? "▾ Hide take workspace"
              : "✎ Add your take (original value)"}
          </Box>
          <Button
            size="sm"
            colorPalette={treatment === "review" ? "purple" : "blue"}
            onClick={() =>
              onWrite(lead.id, author, genImage, treatment, {
                angle,
                take,
                sourceText,
              })
            }
            loading={busy}
          >
            {treatment === "review" ? "Write as review" : "Write this"}
          </Button>
          {isOwner && (
            <Box
              as="button"
              onClick={() => setShowQuick((v) => !v)}
              w="full"
              textAlign="center"
              fontSize="xs"
              fontWeight="700"
              color="#00E5D0"
              borderWidth="1px"
              borderColor="rgba(0,229,208,0.4)"
              borderRadius="md"
              py="6px"
              _hover={{ bg: "rgba(0,229,208,0.08)" }}
            >
              {showQuick
                ? "▾ Hide quick announce"
                : "⚡ Quick announce (X + Threads)"}
            </Box>
          )}
          {isOwner && showQuick && (
            <Box
              borderWidth="1px"
              borderColor="rgba(0,229,208,0.25)"
              borderRadius="md"
              p={2}
              bg="rgba(0,229,208,0.04)"
            >
              <Text fontSize="10px" color="nexzy.gray.100" mb={1}>
                Skips the article — writes a fast X + Threads take straight from
                this lead (link-free). Lands in Content Studio → Suggestions as
                a ⚡ QUICK card.
              </Text>
              <Text
                fontSize="10px"
                color="#00E5D0"
                fontWeight="700"
                mb={1}
              >
                Context (grounds BOTH takes — the raw lead is thin, so paste any
                extra facts / details here):
              </Text>
              <Textarea
                value={quickContext}
                onChange={(e) => setQuickContext(e.target.value)}
                placeholder="e.g. what happened, the exact date/price, why it matters, your angle…"
                size="xs"
                rows={3}
                mb={2}
                bg="whiteAlpha.50"
                borderColor="rgba(0,229,208,0.3)"
                color="white"
                fontSize="xs"
              />
              <Text fontSize="10px" color="nexzy.gray.100" mb={1}>
                Optional steer for each (a distinct take is written per
                platform):
              </Text>
              <Textarea
                value={xSteer}
                onChange={(e) => setXSteer(e.target.value)}
                placeholder="Steer the X take (optional)…"
                size="xs"
                rows={2}
                mb={2}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.200"
                color="white"
                fontSize="xs"
              />
              <Textarea
                value={threadsSteer}
                onChange={(e) => setThreadsSteer(e.target.value)}
                placeholder="Steer the Threads take (optional)…"
                size="xs"
                rows={2}
                mb={2}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.200"
                color="white"
                fontSize="xs"
              />
              <Button
                size="xs"
                w="full"
                colorPalette="teal"
                onClick={() =>
                  onQuickAnnounce(
                    lead.id,
                    author,
                    quickContext,
                    xSteer,
                    threadsSteer,
                  )
                }
                loading={busy}
              >
                ⚡ Generate quick announce
              </Button>
            </Box>
          )}
          <Button
            size="sm"
            variant="outline"
            color="nexzy.gray.100"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => onSkip(lead.id)}
            disabled={busy}
          >
            Skip
          </Button>
        </VStack>
      </Flex>
      {needsPasteBox && (
        <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Text
            fontSize="xs"
            color="nexzy.lightBlue"
            fontWeight="700"
            mb={1}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Paste source text — do this before Write this
          </Text>
          <Text fontSize="xs" color="nexzy.gray.100" mb={2} lineHeight="1.5">
            We can&rsquo;t reliably auto-read this source (behind a login, a
            page monitor, or a publisher we don&rsquo;t auto-read). Paste the
            full article / page text here so the writer works from real content
            — without it, it only has the headline and will guess.
          </Text>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={6}
            placeholder="Paste the full email / press-release text here…"
            bg="whiteAlpha.50"
            color="nexzy.white"
            borderColor={
              sourceText.trim() ? "green.400/50" : "rgba(255,159,64,0.5)"
            }
            fontSize="sm"
          />
        </Box>
      )}
      {showTake && (
        <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={5}
            align="stretch"
          >
            {/* Competing angles */}
            <Box flex={1} minW={0}>
              {!analysis ? (
                <>
                  <Text
                    fontSize="11px"
                    color="#FFD866"
                    fontWeight="700"
                    mb={2}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Competing angles
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    color="nexzy.gray.100"
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={runAnalyze}
                    loading={analyzing}
                  >
                    See competing angles
                  </Button>
                  <Text color="whiteAlpha.500" fontSize="xs" mt={2}>
                    Uses one AI credit — reads the {lead.sourceCount} outlets
                    and maps who took which angle + what's still unclaimed.
                  </Text>
                </>
              ) : (
                <VStack align="stretch" gap={4}>
                  {/* ── Section 1: how the outlets already cover it ── */}
                  <Box>
                    <Text
                      fontSize="11px"
                      color="whiteAlpha.600"
                      fontWeight="700"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      1 · How the {lead.sourceCount} outlets already cover it
                    </Text>
                    <VStack align="stretch" gap={2}>
                      {(analysis.differentiation?.clusters ?? []).length ===
                      0 ? (
                        <Text color="whiteAlpha.500" fontSize="sm">
                          (no distinct angles found)
                        </Text>
                      ) : (
                        (analysis.differentiation?.clusters ?? []).map(
                          (c, i) => (
                            <Box
                              key={i}
                              bg="whiteAlpha.50"
                              borderRadius="md"
                              px={3}
                              py={2}
                            >
                              <Text
                                color="nexzy.white"
                                fontWeight="600"
                                fontSize="sm"
                                lineHeight="1.3"
                              >
                                {c.angle}
                              </Text>
                              <HStack gap={1} wrap="wrap" mt={1}>
                                {(c.outlets ?? []).map((o, j) => (
                                  <Box
                                    key={j}
                                    px={2}
                                    py="1px"
                                    borderRadius="full"
                                    bg="whiteAlpha.100"
                                    color="nexzy.gray.100"
                                    fontSize="11px"
                                    fontWeight="600"
                                  >
                                    {o.name}
                                  </Box>
                                ))}
                              </HStack>
                            </Box>
                          ),
                        )
                      )}
                    </VStack>
                  </Box>

                  {/* ── Section 2: the unclaimed gap ── */}
                  {(analysis.differentiation?.gap ?? []).length > 0 && (
                    <Box>
                      <Text
                        fontSize="11px"
                        color="whiteAlpha.600"
                        fontWeight="700"
                        mb={2}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        2 · Nobody's covered this yet
                      </Text>
                      <VStack align="stretch" gap={1}>
                        {(analysis.differentiation?.gap ?? []).map((g, i) => (
                          <Text
                            key={i}
                            color="nexzy.gray.100"
                            fontSize="sm"
                            lineHeight="1.4"
                          >
                            • {g}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* ── Section 3: angles only Nexzy could own (clickable) ── */}
                  <Box>
                    <Text
                      fontSize="11px"
                      color="#FFD866"
                      fontWeight="700"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      3 · Angles only Nexzy could own
                    </Text>
                    {(analysis.angleSuggestions ?? []).length > 0 ? (
                      <VStack align="stretch" gap={2}>
                        {(analysis.angleSuggestions ?? []).map((s, i) => {
                          const wellLabel =
                            s.well === "data"
                              ? "OUR DATA"
                              : s.well === "connection"
                                ? "GAME TIE-IN"
                                : "OUR EXPERTISE";
                          const wellColor =
                            s.well === "data"
                              ? "blue.400"
                              : s.well === "connection"
                                ? "purple.400"
                                : "green.400";
                          return (
                            <Box
                              key={i}
                              as="button"
                              textAlign="left"
                              onClick={() => setAngle(s.angle)}
                              bg="whiteAlpha.50"
                              border="1px solid"
                              borderColor="whiteAlpha.200"
                              borderRadius="md"
                              px={3}
                              py={2}
                              _hover={{
                                borderColor: "#FFD866",
                                bg: "rgba(255,216,102,0.06)",
                              }}
                            >
                              <HStack gap={2} mb={1}>
                                <Box
                                  px={2}
                                  py="1px"
                                  borderRadius="sm"
                                  bg="whiteAlpha.100"
                                  color={wellColor}
                                  fontSize="10px"
                                  fontWeight="700"
                                  letterSpacing="wide"
                                >
                                  {wellLabel}
                                </Box>
                              </HStack>
                              <Text
                                color="nexzy.white"
                                fontWeight="700"
                                fontSize="sm"
                                lineHeight="1.3"
                              >
                                {s.angle}
                              </Text>
                              <Text
                                color="nexzy.gray.100"
                                fontSize="xs"
                                mt={1}
                                lineHeight="1.4"
                              >
                                {s.whyDifferent}
                              </Text>
                              <Text
                                color="nexzy.lightBlue"
                                fontSize="xs"
                                fontWeight="600"
                                mt={1}
                              >
                                Use this angle →
                              </Text>
                            </Box>
                          );
                        })}
                      </VStack>
                    ) : (
                      <Text color="whiteAlpha.600" fontSize="sm">
                        No angle only Nexzy could own → this is commodity. Write
                        it for social if you want, but it stays out of Google.
                      </Text>
                    )}
                  </Box>
                </VStack>
              )}
            </Box>
            {/* Your take */}
            <Box flex={1} minW={0}>
              <Text
                fontSize="11px"
                color="#FFD866"
                fontWeight="700"
                mb={2}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Your take (original value)
              </Text>
              <Input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="Angle (optional) — the different approach you're taking"
                mb={2}
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _placeholder={{ color: "whiteAlpha.500" }}
              />
              <Textarea
                value={take}
                onChange={(e) => setTake(e.target.value)}
                rows={8}
                placeholder={`Your take — rough notes are fine, we'll shape it into ${author}'s voice. Leave empty for commodity news.`}
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _placeholder={{ color: "whiteAlpha.500" }}
              />
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

/**
 * The Leads Board — the Editor-in-Chief's desk. Ranked story leads from the
 * Assignment Desk; pick "Write this" to send one into the writer, or "Skip".
 */
export default function LeadsBoard({ isOwner = false }: { isOwner?: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningEmail, setScanningEmail] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [beat, setBeat] = useState<string | null>(null);
  const [writer, setWriter] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [authors, setAuthors] = useState<string[]>(LEAD_AUTHORS);
  useEffect(() => {
    getWriterNames()
      .then(setAuthors)
      .catch(() => {});
  }, []);

  const load = () => {
    setRefreshing(true);
    getLeads()
      .then((d) => {
        setLeads(d);
        setError("");
      })
      .catch((e) => setError((e as Error)?.message || "Failed to load leads."))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
  }, []);

  const scan = async () => {
    setScanning(true);
    setMsg("");
    try {
      await runDesk();
      setMsg("Scan queued — new leads will appear in a minute. Hit Refresh.");
    } catch (e) {
      setMsg((e as Error)?.message || "Could not start a scan.");
    } finally {
      setScanning(false);
    }
  };

  const scanEmail = async () => {
    setScanningEmail(true);
    setMsg("");
    try {
      const r = await runEmailIngest();
      if (r.error) {
        setMsg(`Email scan couldn't run: ${r.error}`);
      } else if (r.created > 0) {
        setMsg(
          `Email scan: ${r.created} new lead${r.created === 1 ? "" : "s"} from ${r.scanned} message${r.scanned === 1 ? "" : "s"}. Hit Refresh.`,
        );
      } else {
        setMsg(
          `Email scan: scanned ${r.scanned}, created 0, skipped ${r.skipped}. ` +
            (r.scanned === 0
              ? "Nothing new + unread in the last 48h (already-read mail is skipped)."
              : "All seen messages were duplicates of existing leads."),
        );
      }
    } catch (e) {
      setMsg((e as Error)?.message || "Could not run the email scan.");
    } finally {
      setScanningEmail(false);
    }
  };

  const emailDigest = async () => {
    setEmailing(true);
    setMsg("");
    try {
      const r = await sendLeadDigest();
      setMsg(
        r.sent > 0
          ? `Emailed ${r.leads} lead${r.leads === 1 ? "" : "s"} to ${r.sent} inbox${r.sent === 1 ? "" : "es"}.`
          : "No leads to email right now.",
      );
    } catch (e) {
      setMsg((e as Error)?.message || "Could not send the digest.");
    } finally {
      setEmailing(false);
    }
  };

  const doWrite = async (
    id: string,
    author: string,
    generateImage: boolean,
    treatment: "news" | "review",
    opts?: { angle?: string; take?: string; sourceText?: string },
  ) => {
    setBusyId(id);
    try {
      if (treatment === "review") {
        await writeLeadReview(id, author, generateImage);
      } else {
        await writeLead(id, author, generateImage, opts);
      }
      setLeads((ls) => (ls ? ls.filter((l) => l.id !== id) : ls));
    } catch (e) {
      setMsg((e as Error)?.message || "Could not assign the lead.");
    } finally {
      setBusyId(null);
    }
  };

  const doSkip = async (id: string) => {
    setBusyId(id);
    try {
      await skipLead(id);
      setLeads((ls) => (ls ? ls.filter((l) => l.id !== id) : ls));
    } catch (e) {
      setMsg((e as Error)?.message || "Could not skip the lead.");
    } finally {
      setBusyId(null);
    }
  };

  const doQuickAnnounce = async (
    id: string,
    author: string,
    context: string,
    xSteer: string,
    threadsSteer: string,
  ) => {
    setBusyId(id);
    try {
      const row = await quickAnnounceFromLead(
        id,
        author,
        context,
        xSteer,
        threadsSteer,
      );
      if (!row) {
        setMsg("Quick announce produced no copy — try again or add a steer.");
        return;
      }
      // Consumed on the server → drop it from the board. The ⚡ QUICK card is now
      // in Content Studio → Suggestions (upload media there, then publish).
      setLeads((ls) => (ls ? ls.filter((l) => l.id !== id) : ls));
      setMsg(
        "⚡ Quick announce created — find it in Content Studio → Suggestions.",
      );
    } catch (e) {
      setMsg((e as Error)?.message || "Could not create the quick announce.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(
    () =>
      (leads || []).filter(
        (l) =>
          (!beat || l.beat === beat) &&
          (!writer || (l.suggestedAuthor || "") === writer),
      ),
    [leads, beat, writer],
  );

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={3} gap={3} wrap="wrap">
        <Heading size="md" color="nexzy.white">
          Leads{" "}
          <Text as="span" color="nexzy.gray.100" fontSize="md" fontWeight="400">
            ({filtered.length})
          </Text>
        </Heading>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={load}
            loading={refreshing}
            loadingText="…"
          >
            Refresh
          </Button>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={scanEmail}
              loading={scanningEmail}
              loadingText="Scanning…"
            >
              ✉ Scan email
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={emailDigest}
              loading={emailing}
              loadingText="Emailing…"
            >
              ✉ Email leads
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              colorPalette="blue"
              onClick={scan}
              loading={scanning}
              loadingText="Scanning…"
            >
              Scan now
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Beat filter */}
      <HStack gap={2} wrap="wrap" mb={4}>
        <Button
          size="xs"
          onClick={() => setBeat(null)}
          bg={beat === null ? "nexzy.blue" : "transparent"}
          color={beat === null ? "white" : "nexzy.gray.100"}
          borderWidth="1px"
          borderColor={beat === null ? "nexzy.blue" : "whiteAlpha.300"}
          _hover={{ bg: beat === null ? "nexzy.blue" : "whiteAlpha.100" }}
        >
          All beats
        </Button>
        {BEATS.map((b) => {
          const active = beat === b.key;
          return (
            <Button
              key={b.key}
              size="xs"
              onClick={() => setBeat(active ? null : b.key)}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              {b.label}
            </Button>
          );
        })}
      </HStack>

      {/* Writer filter — filter leads by their suggested author (extensible). */}
      <HStack gap={2} wrap="wrap" mb={4}>
        <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600" mr={1}>
          Writer:
        </Text>
        <Button
          size="xs"
          onClick={() => setWriter(null)}
          bg={writer === null ? "nexzy.blue" : "transparent"}
          color={writer === null ? "white" : "nexzy.gray.100"}
          borderWidth="1px"
          borderColor={writer === null ? "nexzy.blue" : "whiteAlpha.300"}
          _hover={{ bg: writer === null ? "nexzy.blue" : "whiteAlpha.100" }}
        >
          All writers
        </Button>
        {authors.map((a) => {
          const active = writer === a;
          return (
            <Button
              key={a}
              size="xs"
              onClick={() => setWriter(active ? null : a)}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              {a}
            </Button>
          );
        })}
      </HStack>

      {/* Tag legend — why a lead is Commodity / Ownable / untagged. */}
      <Box
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        bg="whiteAlpha.50"
        px={4}
        py={3}
        mb={4}
      >
        <Text
          fontSize="11px"
          color="#FFD866"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={2}
        >
          What the tags mean
        </Text>
        <VStack align="stretch" gap={2} fontSize="sm">
          <HStack align="flex-start" gap={3}>
            <Box
              px={2}
              py="1px"
              borderRadius="md"
              bg="whiteAlpha.100"
              color="whiteAlpha.700"
              fontSize="xs"
              fontWeight="600"
              flexShrink={0}
              mt="1px"
            >
              Commodity
            </Box>
            <Text color="nexzy.gray.100">
              Everyone will run this story the same way — no fresh angle. Write
              it for readers/social, but it stays{" "}
              <Text as="span" color="nexzy.white" fontWeight="600">
                out of Google
              </Text>
              . Auto-set for <b>Deals</b> + <b>Patch notes</b>, or set when the
              angle check finds nothing ownable.
            </Text>
          </HStack>
          <HStack align="flex-start" gap={3}>
            <Box
              px={2}
              py="1px"
              borderRadius="md"
              bg="green.600"
              color="white"
              fontSize="xs"
              fontWeight="700"
              flexShrink={0}
              mt="1px"
            >
              Ownable
            </Box>
            <Text color="nexzy.gray.100">
              There's an angle only Nexzy can add. Worth a real take →{" "}
              <Text as="span" color="nexzy.white" fontWeight="600">
                index it in Google
              </Text>
              . Set after you click <b>See competing angles</b> and the check
              finds a gap.
            </Text>
          </HStack>
          <HStack align="flex-start" gap={3}>
            <Box
              px={2}
              py="1px"
              borderRadius="md"
              bg="transparent"
              border="1px dashed"
              borderColor="whiteAlpha.400"
              color="whiteAlpha.600"
              fontSize="xs"
              fontWeight="600"
              flexShrink={0}
              mt="1px"
            >
              no tag
            </Box>
            <Text color="nexzy.gray.100">
              Not judged yet. News leads start blank because deciding costs an
              AI call — click <b>See competing angles</b> on the card and it
              becomes Commodity or Ownable.
            </Text>
          </HStack>
        </VStack>
      </Box>

      {msg && (
        <Text color="nexzy.lightBlue" fontSize="sm" mb={3}>
          {msg}
        </Text>
      )}

      {error ? (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      ) : !leads ? (
        <Flex justify="center" py={10}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      ) : filtered.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No leads right now. Hit “Scan now” to pull fresh stories from the
          feeds.
        </Text>
      ) : (
        <Paginated items={filtered} pageSize={20}>
          {(pageLeads) => (
            <VStack gap={3} align="stretch">
              {pageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onWrite={doWrite}
                  onSkip={doSkip}
                  onQuickAnnounce={doQuickAnnounce}
                  busy={busyId === lead.id}
                  authors={authors}
                  isOwner={isOwner}
                />
              ))}
            </VStack>
          )}
        </Paginated>
      )}
    </Box>
  );
}
