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
  sendLeadDigest,
  analyzeLead,
  writeLead,
  writeLeadReview,
  skipLead,
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
  busy,
  authors,
}: {
  lead: Lead;
  onWrite: (
    id: string,
    author: string,
    generateImage: boolean,
    treatment: "news" | "review",
    opts?: { angle?: string; take?: string },
  ) => void;
  onSkip: (id: string) => void;
  busy: boolean;
  authors: string[];
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
          {lead.sources && lead.sources.length > 0 && (
            <Box mt={2}>
              <Button
                size="xs"
                variant="ghost"
                color="nexzy.lightBlue"
                px={0}
                _hover={{ bg: "transparent", textDecoration: "underline" }}
                onClick={() => setShowSources((s) => !s)}
              >
                {showSources
                  ? "Hide sources"
                  : `Sources (${lead.sources.length})`}
              </Button>
              {showSources && (
                <VStack align="stretch" gap={1} mt={1}>
                  {lead.sources.map((s, i) => (
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
            </Box>
          )}
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
              onWrite(lead.id, author, genImage, treatment, { angle, take })
            }
            loading={busy}
          >
            {treatment === "review" ? "Write as review" : "Write this"}
          </Button>
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
      {showTake && (
        <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={5}
            align="stretch"
          >
            {/* Competing angles */}
            <Box flex={1} minW={0}>
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
              {!analysis ? (
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
              ) : (
                <VStack
                  align="stretch"
                  gap={2}
                  fontSize="sm"
                  color="nexzy.gray.100"
                  lineHeight="1.5"
                >
                  {(analysis.differentiation?.clusters ?? []).map((c, i) => (
                    <Text key={i}>
                      <Text as="span" color="nexzy.white" fontWeight="600">
                        {c.angle}:
                      </Text>{" "}
                      {(c.outlets ?? []).map((o) => o.name).join(", ")}
                    </Text>
                  ))}
                  {(analysis.differentiation?.gap ?? []).length > 0 && (
                    <Text color="#FFD866">
                      Unclaimed:{" "}
                      {(analysis.differentiation?.gap ?? []).join("; ")}
                    </Text>
                  )}
                  {(analysis.angleSuggestions ?? []).length > 0 ? (
                    <VStack align="stretch" gap={2} mt={1}>
                      {(analysis.angleSuggestions ?? []).map((s, i) => (
                        <Box
                          key={i}
                          as="button"
                          textAlign="left"
                          onClick={() => setAngle(s.angle)}
                          color="nexzy.lightBlue"
                          _hover={{ textDecoration: "underline" }}
                        >
                          → {s.angle}{" "}
                          <Text as="span" color="whiteAlpha.600">
                            ({s.well}) — {s.whyDifferent}
                          </Text>
                        </Box>
                      ))}
                      <Text color="whiteAlpha.500" fontSize="xs">
                        Click an angle to drop it into your take.
                      </Text>
                    </VStack>
                  ) : (
                    <Text color="whiteAlpha.600">
                      No ownable angle — commodity (write for social / noindex).
                    </Text>
                  )}
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
    opts?: { angle?: string; take?: string },
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
                  busy={busyId === lead.id}
                  authors={authors}
                />
              ))}
            </VStack>
          )}
        </Paginated>
      )}
    </Box>
  );
}
