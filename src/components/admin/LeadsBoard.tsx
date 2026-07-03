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
} from "@chakra-ui/react";
import {
  getLeads,
  runDesk,
  sendLeadDigest,
  writeLead,
  skipLead,
  type Lead,
} from "@/lib/admin/client";
import { BEATS, beatLabel } from "@/lib/blog/beats";

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

const LEAD_AUTHORS = ["Chuy", "Eli"];

function LeadCard({
  lead,
  onWrite,
  onSkip,
  busy,
}: {
  lead: Lead;
  onWrite: (id: string, author: string) => void;
  onSkip: (id: string) => void;
  busy: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const [author, setAuthor] = useState(lead.suggestedAuthor || "Chuy");
  const hot = lead.trendScore >= 60;
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={hot ? "orange.400" : "whiteAlpha.200"}
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
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
        <VStack gap={2} align="stretch" minW="120px">
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
              {LEAD_AUTHORS.map((a) => {
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
          <Button
            size="sm"
            colorPalette="blue"
            onClick={() => onWrite(lead.id, author)}
            loading={busy}
          >
            Write this
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
    </Box>
  );
}

/**
 * The Leads Board — the Editor-in-Chief's desk. Ranked story leads from the
 * Assignment Desk; pick "Write this" to send one into the writer, or "Skip".
 */
export default function LeadsBoard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [beat, setBeat] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

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

  const doWrite = async (id: string, author: string) => {
    setBusyId(id);
    try {
      await writeLead(id, author);
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
    () => (leads || []).filter((l) => !beat || l.beat === beat),
    [leads, beat],
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
          <Button
            size="sm"
            colorPalette="blue"
            onClick={scan}
            loading={scanning}
            loadingText="Scanning…"
          >
            Scan now
          </Button>
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
        <VStack gap={3} align="stretch">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onWrite={doWrite}
              onSkip={doSkip}
              busy={busyId === lead.id}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}
