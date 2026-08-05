"use client";

import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
} from "@chakra-ui/react";
import {
  getTrendingNow,
  makeLeadFromTrend,
  type TrendingTopic,
} from "@/lib/admin/client";
import { BEATS } from "@/lib/blog/beats";

const HOURS = [
  { v: 4, label: "4h" },
  { v: 24, label: "24h" },
  { v: 48, label: "48h" },
];

const nativeControl: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#EAF0FA",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};

function TrendCard({ topic }: { topic: TrendingTopic }) {
  const [open, setOpen] = useState(false);
  const [beat, setBeat] = useState<string>("game_news");
  const [angle, setAngle] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const context = topic.related.length
    ? `related: ${topic.related.join(", ")}`
    : "";

  const make = async (writeNow: boolean) => {
    setBusy(writeNow ? "write" : "lead");
    setMsg(null);
    try {
      await makeLeadFromTrend({
        term: topic.query,
        beat,
        angle: angle.trim() || undefined,
        notes: notes.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        context: context || undefined,
        writeNow,
      });
      setMsg(
        writeNow
          ? "Queued — a draft is being written; it'll land in the review queue."
          : "Lead created — find it on the Leads board.",
      );
      setOpen(false);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderColor={topic.active ? "orange.400" : "whiteAlpha.200"}
      borderRadius="8px"
      bg="whiteAlpha.50"
      p={3}
    >
      <HStack justify="space-between" align="start" gap={3}>
        <VStack align="start" gap={1} flex={1} minW={0}>
          <HStack gap={2} wrap="wrap">
            <Text fontSize="sm" fontWeight="700" color="nexzy.white">
              {topic.query}
            </Text>
            {topic.active && (
              <Text fontSize="10px" color="orange.300" fontWeight="700">
                ● ACTIVE
              </Text>
            )}
          </HStack>
          <HStack gap={3} wrap="wrap">
            {topic.searchVolume > 0 && (
              <Text fontSize="xs" color="whiteAlpha.700">
                {topic.searchVolume.toLocaleString()}+ searches
              </Text>
            )}
            {topic.increasePct > 0 && (
              <Text fontSize="xs" color="green.300" fontWeight="600">
                ▲ {topic.increasePct}%
              </Text>
            )}
          </HStack>
          {topic.related.length > 0 && (
            <Text fontSize="xs" color="whiteAlpha.500" lineClamp={2}>
              {topic.related.join(" · ")}
            </Text>
          )}
        </VStack>
        <Button
          size="xs"
          bg="nexzy.blue"
          color="white"
          _hover={{ opacity: 0.9 }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Make a lead"}
        </Button>
      </HStack>

      {open && (
        <VStack
          align="stretch"
          gap={2}
          mt={3}
          pt={3}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontSize="10px" color="whiteAlpha.600" fontWeight="700">
            BEAT
          </Text>
          <select
            value={beat}
            onChange={(e) => setBeat(e.target.value)}
            style={nativeControl}
          >
            {BEATS.map((b) => (
              <option key={b.key} value={b.key} style={{ color: "#000" }}>
                {b.label}
              </option>
            ))}
          </select>
          <Input
            {...inputProps}
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="Angle (optional) — how you want it framed"
          />
          <Textarea
            {...inputProps}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your notes / facts you know (optional) — one per line, treated as trusted"
            rows={3}
          />
          <Input
            {...inputProps}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="A link you saw (optional)"
          />
          <HStack gap={2}>
            <Button
              size="sm"
              bg="nexzy.blue"
              color="white"
              _hover={{ opacity: 0.9 }}
              onClick={() => make(false)}
              loading={busy === "lead"}
              loadingText="Researching…"
            >
              Create lead
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="nexzy.gray.100"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => make(true)}
              loading={busy === "write"}
              loadingText="Queuing…"
            >
              Create &amp; write now
            </Button>
          </HStack>
        </VStack>
      )}
      {msg && (
        <Text fontSize="sm" color="nexzy.lightBlue" mt={2}>
          {msg}
        </Text>
      )}
    </Box>
  );
}

export default function TrendingPanel() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = (force = false) => {
    setLoading(true);
    getTrendingNow({ hours, force })
      .then((r) => {
        setTopics(r.topics);
        setEnabled(r.enabled);
        setErr("");
      })
      .catch((e) => setErr((e as Error)?.message || "Failed to load trends."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  return (
    <Box maxW="760px">
      <HStack justify="space-between" mb={1} wrap="wrap" gap={2}>
        <Heading size="md" color="nexzy.white">
          Trending now — gaming
        </Heading>
        <HStack gap={2}>
          {HOURS.map((h) => (
            <Button
              key={h.v}
              size="xs"
              variant={hours === h.v ? "solid" : "outline"}
              bg={hours === h.v ? "nexzy.blue" : "transparent"}
              color={hours === h.v ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              _hover={{ bg: hours === h.v ? "nexzy.blue" : "whiteAlpha.100" }}
              onClick={() => setHours(h.v)}
            >
              {h.label}
            </Button>
          ))}
          <Button
            size="xs"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => load(true)}
            loading={loading}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>
      <Text fontSize="sm" color="whiteAlpha.600" mb={4}>
        What&apos;s spiking in gaming search right now (Google Trends). Turn one
        into a lead — add your own link or notes so the researcher grounds the
        right story.
      </Text>

      {!enabled ? (
        <Text fontSize="sm" color="orange.300">
          Trending is off. Set NEXZY_TRENDING_ENABLED=true and SERPAPI_KEY on
          the API to turn it on.
        </Text>
      ) : err ? (
        <Text fontSize="sm" color="red.300">
          {err}
        </Text>
      ) : loading ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          Loading trends…
        </Text>
      ) : topics.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          No trending gaming topics right now. Try a wider window or Refresh.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {topics.map((t) => (
            <TrendCard key={t.query} topic={t} />
          ))}
        </VStack>
      )}
    </Box>
  );
}
