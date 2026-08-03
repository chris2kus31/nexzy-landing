"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Badge,
  Link,
  Spinner,
  Textarea,
} from "@chakra-ui/react";
import {
  getVideoLeads,
  generateFromLead,
  skipContentSuggestion,
  getWriterNames,
  getAudienceProfile,
  refreshAudienceProfile,
  type AudienceProfile,
  type ContentSuggestion,
} from "@/lib/admin/client";

const LANE_COLOR: Record<string, string> = {
  deal: "orange",
  news: "blue",
  guide: "cyan",
};

const FORMATS: { key: string; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "long", label: "Long-form" },
  { key: "image", label: "Image" },
  { key: "text_post", label: "Text post" },
  { key: "none", label: "No video" },
];

const X_FORMATS: { key: string; label: string }[] = [
  { key: "hot_take", label: "Hot take" },
  { key: "thread", label: "Thread" },
  { key: "poll", label: "Poll" },
  { key: "image", label: "Image" },
  { key: "clip", label: "Clip" },
];

function topEntry(m?: Record<string, number>): [string, number] | null {
  const e = Object.entries(m || {}).sort((a, b) => b[1] - a[1]);
  return e.length ? e[0] : null;
}
function peakHours(hours?: number[]): string {
  if (!Array.isArray(hours) || !hours.some((n) => n > 0)) return "";
  return hours
    .map((n, h) => ({ n, h }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => `${String(x.h).padStart(2, "0")}:00`)
    .join(", ");
}

function fmtLabel(key?: string): string {
  return FORMATS.find((f) => f.key === key)?.label ?? key ?? "Short";
}

/** One video lead: pick writer + format, then Generate (spends tokens). */
function LeadCard({
  s,
  writers,
  isOwner,
  onDone,
  reload,
}: {
  s: ContentSuggestion;
  writers: string[];
  isOwner: boolean;
  onDone: (id: string) => void;
  reload: () => void | Promise<void>;
}) {
  const lead = s.payload?.lead;
  const [writer, setWriter] = useState(
    lead?.suggestedWriter || s.author || "Chuy",
  );
  const [format, setFormat] = useState(lead?.suggestedFormat || "short");
  const [busy, setBusy] = useState<"gen" | "skip" | null>(null);
  const [steer, setSteer] = useState("");
  const [xFormat, setXFormat] = useState(lead?.xFormat || "hot_take");
  const generating = !!s.payload?.generating;
  const lastError = s.payload?.lastError;

  const writerOptions =
    writers.length > 0
      ? Array.from(new Set([writer, ...writers]))
      : [writer, "Chuy", "Leslie", "Bana"].filter(
          (v, i, a) => a.indexOf(v) === i,
        );

  const generate = async () => {
    setBusy("gen");
    try {
      await generateFromLead(
        s.id,
        writer,
        format,
        steer.trim() || undefined,
        xFormat,
      );
      await reload(); // pick up the queued 'generating' state (or removal)
    } catch {
      /* leave the lead in place so you can retry */
    } finally {
      setBusy(null);
    }
  };
  const skip = async () => {
    setBusy("skip");
    try {
      await skipContentSuggestion(s.id);
      onDone(s.id);
    } catch {
      setBusy(null);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2}>
        <HStack gap={2} wrap="wrap" flex={1} minW={0}>
          <Badge
            colorPalette={LANE_COLOR[s.lane ?? ""] || "gray"}
            variant="solid"
          >
            {(s.lane ?? "news").toUpperCase()}
          </Badge>
          <Badge colorPalette="purple" variant="subtle">
            suggests: {fmtLabel(lead?.suggestedFormat)}
          </Badge>
          {lead?.xFormat && (
            <Badge colorPalette="cyan" variant="subtle">
              X: {lead.xFormat.replace(/_/g, " ")}
            </Badge>
          )}
          {lead?.when && (
            <Badge
              colorPalette={
                lead.when === "now"
                  ? "green"
                  : lead.when === "pre_event"
                    ? "orange"
                    : "blue"
              }
              variant="subtle"
            >
              {lead.when === "now"
                ? "POST NOW"
                : lead.when === "pre_event"
                  ? "PRE-EVENT"
                  : "SCHEDULE"}
            </Badge>
          )}
          <Text color="nexzy.white" fontWeight="700" lineClamp={1}>
            {s.title}
          </Text>
        </HStack>
      </Flex>

      {lead?.summary && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
          {lead.summary}
        </Text>
      )}
      {lead?.timing && (
        <Text color="nexzy.lightBlue" fontSize="xs" mb={2}>
          🕒 {lead.timing}
        </Text>
      )}
      {lead?.reason && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={3} fontStyle="italic">
          Why: {lead.reason}
        </Text>
      )}

      {lastError && (
        <Text color="red.300" fontSize="xs" mb={3}>
          ⚠ Last generation failed: {lastError}. Adjust and retry.
        </Text>
      )}

      {/* Writer picker */}
      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Writer / voice
      </Text>
      <HStack gap={1} wrap="wrap" mb={3}>
        {writerOptions.map((w) => (
          <Button
            key={w}
            size="xs"
            variant={writer === w ? "solid" : "outline"}
            bg={writer === w ? "nexzy.blue" : "transparent"}
            color={writer === w ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: writer === w ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setWriter(w)}
          >
            {w}
          </Button>
        ))}
      </HStack>

      {/* Format picker */}
      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Format
      </Text>
      <HStack gap={1} wrap="wrap" mb={4}>
        {FORMATS.map((f) => (
          <Button
            key={f.key}
            size="xs"
            variant={format === f.key ? "solid" : "outline"}
            bg={format === f.key ? "nexzy.blue" : "transparent"}
            color={format === f.key ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: format === f.key ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setFormat(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        X format{lead?.xFormat ? ` · suggested: ${lead.xFormat.replace(/_/g, " ")}` : ""}
      </Text>
      <HStack gap={1} wrap="wrap" mb={4}>
        {X_FORMATS.map((f) => (
          <Button
            key={f.key}
            size="xs"
            variant={xFormat === f.key ? "solid" : "outline"}
            bg={xFormat === f.key ? "nexzy.blue" : "transparent"}
            color={xFormat === f.key ? "white" : "nexzy.gray.100"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: xFormat === f.key ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => setXFormat(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Notes / steer (optional — factored into the generated video)
      </Text>
      <Textarea
        value={steer}
        onChange={(e) => setSteer(e.target.value)}
        rows={2}
        mb={4}
        bg="whiteAlpha.50"
        color="nexzy.white"
        borderColor="whiteAlpha.300"
        fontSize="sm"
        placeholder="e.g. sound excited; note it's a sequel; keep it tight"
      />

      <Flex justify="space-between" align="center" gap={2}>
        {s.url ? (
          <Link
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.lightBlue"
            fontSize="xs"
          >
            Article ↗
          </Link>
        ) : (
          <Box />
        )}
        <HStack gap={2}>
          {isOwner && (
            <Button
              size="sm"
              colorPalette="green"
              onClick={generate}
              loading={busy === "gen" || generating}
              loadingText="Generating…"
              disabled={generating}
            >
              {lastError ? "🎬 Retry" : "🎬 Generate"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
            onClick={skip}
            loading={busy === "skip"}
            loadingText="…"
          >
            Skip
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

/**
 * Leads — every published article lands here as a zero-heavy-token video lead
 * with a suggested writer + format. Pick, then Generate → the real card is
 * written (in that voice) and appears under Suggestions.
 */
export default function LeadsPanel({ isOwner }: { isOwner: boolean }) {
  const [leads, setLeads] = useState<ContentSuggestion[] | null>(null);
  const [writers, setWriters] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<AudienceProfile | null>(null);
  const [audBusy, setAudBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, w] = await Promise.all([
        getVideoLeads(),
        getWriterNames().catch(() => []),
      ]);
      setLeads(l);
      setWriters(w);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load leads.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAudienceProfile()
      .then(setAudience)
      .catch(() => setAudience(null));
  }, []);

  // While any lead is generating (a queued job is running), poll so the board
  // updates when it finishes (card appears in Suggestions) or fails.
  useEffect(() => {
    if (!leads?.some((l) => l.payload?.generating)) return;
    const t = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(t);
  }, [leads, load]);

  const remove = (id: string) =>
    setLeads((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));

  const refreshAud = async () => {
    setAudBusy(true);
    try {
      setAudience(await refreshAudienceProfile());
    } catch {
      /* leave as-is on failure */
    } finally {
      setAudBusy(false);
    }
  };

  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!leads) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Video leads
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Each published article lands here first. Pick the writer and format,
          then Generate — nothing heavy runs until you do.
        </Text>
      </Box>

      {(isOwner || audience?.dominantAge) && (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          px={4}
          py={3}
        >
          <Flex justify="space-between" align="center" gap={2} wrap="wrap">
            <Box minW={0}>
              <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                👥 Audience{audience?.dominantAge ? "" : " — not pulled yet"}
              </Text>
              {audience?.dominantAge ? (
                <Text color="nexzy.gray.100" fontSize="xs">
                  {[
                    `Age ${audience.dominantAge}`,
                    topEntry(audience.gender)
                      ? `${topEntry(audience.gender)![1]}% ${topEntry(audience.gender)![0]}`
                      : "",
                    topEntry(audience.topCountries)
                      ? `top ${topEntry(audience.topCountries)![0]}`
                      : "",
                    peakHours(audience.bestTimes?.byHourUtc)
                      ? `peak ${peakHours(audience.bestTimes?.byHourUtc)} UTC`
                      : "",
                    audience.sources?.length
                      ? `from ${audience.sources.join(", ")}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : (
                <Text color="nexzy.gray.100" fontSize="xs">
                  Pull IG + YouTube demographics to tailor leads — audience age,
                  best posting times, and tone delivery. (IG online-hours need
                  ~100 followers.)
                </Text>
              )}
            </Box>
            {isOwner && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                onClick={refreshAud}
                loading={audBusy}
                loadingText="Pulling…"
              >
                ↻ Refresh audience
              </Button>
            )}
          </Flex>
          {audience?.errors && Object.keys(audience.errors).length > 0 && (
            <Text color="orange.300" fontSize="10px" mt={1}>
              {Object.entries(audience.errors)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </Text>
          )}
        </Box>
      )}

      {leads.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No open leads right now.
        </Text>
      ) : (
        leads.map((s) => (
          <LeadCard
            key={s.id}
            s={s}
            writers={writers}
            isOwner={isOwner}
            onDone={remove}
            reload={load}
          />
        ))
      )}
    </VStack>
  );
}
