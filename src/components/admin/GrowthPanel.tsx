"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import Markdown from "@/components/blog/Markdown";
import {
  getGrowthBrief,
  getGrowthBriefs,
  runGrowth,
  getGrowthStatus,
  getGrowthRecommendations,
  markRecommendationDone,
  dismissRecommendation,
  reopenRecommendation,
  type GrowthBriefResponse,
  type GrowthBriefMeta,
  type GrowthRecommendation,
  type RecommendationStatus,
} from "@/lib/admin/client";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      px={4}
      py={3}
    >
      <Text
        color="nexzy.white"
        fontSize="2xl"
        fontWeight="700"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
    </Box>
  );
}

const EFFORT_COLOR: Record<string, string> = {
  low: "green",
  med: "yellow",
  medium: "yellow",
  high: "red",
};
const IMPACT_COLOR: Record<string, string> = {
  high: "green",
  med: "yellow",
  medium: "yellow",
  low: "gray",
};
const STATUS_COLOR: Record<string, string> = {
  open: "blue",
  done: "green",
  dismissed: "gray",
};

function expertLabel(k: string): string {
  if (k === "aso") return "ASO";
  if (k === "seo") return "SEO";
  return k.toUpperCase();
}

function RecCard({
  r,
  onChanged,
}: {
  r: GrowthRecommendation;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"done" | "dismiss" | "reopen" | null>(null);
  const run = async (
    key: "done" | "dismiss" | "reopen",
    fn: () => Promise<unknown>,
  ) => {
    setBusy(key);
    try {
      await fn();
      onChanged();
    } catch {
      setBusy(null);
    }
  };
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3.5}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={1}>
        <HStack gap={2} flex={1} minW={0} wrap="wrap">
          <Badge colorPalette="purple" variant="subtle">
            {expertLabel(r.expert)}
          </Badge>
          <Text color="nexzy.white" fontWeight="600">
            {r.title}
          </Text>
        </HStack>
        <Badge
          colorPalette={STATUS_COLOR[r.status] ?? "gray"}
          variant="subtle"
          flexShrink={0}
        >
          {r.status}
        </Badge>
      </Flex>
      {r.why && (
        <Text color="nexzy.gray.100" fontSize="sm" mb={2}>
          {r.why}
        </Text>
      )}
      <HStack gap={2} wrap="wrap" mb={r.outcomeNote ? 2 : 3}>
        {r.effort && (
          <Badge
            colorPalette={EFFORT_COLOR[r.effort.toLowerCase()] ?? "gray"}
            variant="outline"
            fontSize="10px"
          >
            effort: {r.effort}
          </Badge>
        )}
        {r.impact && (
          <Badge
            colorPalette={IMPACT_COLOR[r.impact.toLowerCase()] ?? "gray"}
            variant="outline"
            fontSize="10px"
          >
            impact: {r.impact}
          </Badge>
        )}
        {r.category && (
          <Badge colorPalette="gray" variant="subtle" fontSize="10px">
            {r.category}
          </Badge>
        )}
        <Text color="nexzy.gray.100" fontSize="10px">
          {r.day}
        </Text>
      </HStack>
      {r.outcomeNote && (
        <Text color="nexzy.gray.100" fontSize="xs" fontStyle="italic" mb={3}>
          Outcome: {r.outcomeNote}
        </Text>
      )}
      <HStack gap={2} justify="flex-end">
        {r.status === "open" ? (
          <>
            <Button
              size="xs"
              colorPalette="green"
              onClick={() => run("done", () => markRecommendationDone(r.id))}
              loading={busy === "done"}
              disabled={!!busy}
            >
              Mark done
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color="nexzy.gray.100"
              _hover={{ bg: "whiteAlpha.100", color: "red.300" }}
              onClick={() => run("dismiss", () => dismissRecommendation(r.id))}
              loading={busy === "dismiss"}
              disabled={!!busy}
            >
              Dismiss
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => run("reopen", () => reopenRecommendation(r.id))}
            loading={busy === "reopen"}
            disabled={!!busy}
          >
            Re-open
          </Button>
        )}
      </HStack>
    </Box>
  );
}

const REC_FILTERS: RecommendationStatus[] = ["open", "done", "dismissed"];

/**
 * Recommendation memory ledger — the marketing-employee's close-the-loop board.
 * Shows what each expert recommended and lets Chris mark it done or dismiss it;
 * the next brief reads this back so it follows up instead of repeating itself.
 */
function RecommendationsLedger() {
  const [filter, setFilter] = useState<RecommendationStatus>("open");
  const [recs, setRecs] = useState<GrowthRecommendation[] | null>(null);

  const load = useCallback(async () => {
    try {
      setRecs(await getGrowthRecommendations(filter));
    } catch {
      setRecs([]);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box mt={8}>
      <Flex align="center" justify="space-between" mb={3} wrap="wrap" gap={2}>
        <Box>
          <Heading size="sm" color="nexzy.white">
            Recommendation memory
          </Heading>
          <Text color="nexzy.gray.100" fontSize="xs">
            What the experts recommended — mark done or dismiss; the next brief
            follows up.
          </Text>
        </Box>
        <HStack gap={1}>
          {REC_FILTERS.map((fVal) => (
            <Button
              key={fVal}
              size="xs"
              variant={filter === fVal ? "solid" : "ghost"}
              colorPalette={filter === fVal ? "blue" : "gray"}
              color={filter === fVal ? "white" : "nexzy.gray.100"}
              onClick={() => setFilter(fVal)}
            >
              {fVal}
            </Button>
          ))}
        </HStack>
      </Flex>
      {recs === null ? (
        <HStack color="nexzy.gray.100" gap={2}>
          <Spinner size="sm" />
          <Text fontSize="sm">Loading…</Text>
        </HStack>
      ) : recs.length === 0 ? (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={5}
          textAlign="center"
        >
          <Text color="nexzy.gray.100" fontSize="sm">
            No {filter} recommendations.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={2.5}>
          {recs.map((r) => (
            <RecCard key={r.id} r={r} onChanged={load} />
          ))}
        </VStack>
      )}
    </Box>
  );
}

/**
 * The Growth Intelligence tab: the AI daily marketing brief + headline KPIs +
 * source-health badges. A history picker loads any past report; owners can run
 * a fresh collection + brief with "Scan now".
 */
export default function GrowthPanel({ isOwner }: { isOwner: boolean }) {
  const [data, setData] = useState<GrowthBriefResponse | null>(null);
  const [briefs, setBriefs] = useState<GrowthBriefMeta[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (day?: string) => {
    setLoading(true);
    setErr(null);
    try {
      setData(await getGrowthBrief(day));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      setBriefs(await getGrowthBriefs());
    } catch {
      /* non-fatal: the history list is a convenience */
    }
  }, []);

  useEffect(() => {
    void load();
    void refreshList();
  }, [load, refreshList]);

  const onRun = async () => {
    setRunning(true);
    setErr(null);
    try {
      // Kicks off a BACKGROUND run and returns immediately (no long-held
      // request → no 502). Then poll the status until it finishes, and load
      // the fresh brief.
      await runGrowth();
      setSelectedDay(null);
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const startedAt = Date.now();
      const TIMEOUT_MS = 4 * 60 * 1000; // runs are typically 30s-2min
      await sleep(1500);
      while (Date.now() - startedAt < TIMEOUT_MS) {
        let running = false;
        try {
          running = (await getGrowthStatus()).running;
        } catch {
          break; // status blip — stop polling and just load what we have
        }
        if (!running) break;
        await sleep(4000);
      }
      await load();
      await refreshList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const kpis = data?.kpis ?? {};
  const sources = data?.sources ?? {};
  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString() : "—";

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Box>
          <Heading size="md" color="nexzy.white">
            Daily Marketing Brief
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            {data?.day ? `For ${data.day}` : "No snapshot yet"}
            {data?.generatedAt
              ? ` · generated ${new Date(data.generatedAt).toLocaleString()}`
              : ""}
            {data?.briefModel ? ` · ${data.briefModel}` : ""}
          </Text>
        </Box>
        <HStack gap={3}>
          <select
            value={selectedDay ?? ""}
            onChange={(e) => {
              const d = e.target.value || undefined;
              setSelectedDay(d ?? null);
              void load(d);
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 14,
            }}
          >
            <option value="" style={{ color: "black" }}>
              Latest
            </option>
            {briefs.map((b) => (
              <option key={b.day} value={b.day} style={{ color: "black" }}>
                {b.day}
              </option>
            ))}
          </select>
          {isOwner && (
            <Button
              onClick={onRun}
              loading={running}
              size="sm"
              bg="nexzy.blue"
              color="white"
              _hover={{ opacity: 0.9 }}
            >
              {running ? "Scanning…" : "Scan now"}
            </Button>
          )}
        </HStack>
      </Flex>

      {err && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {err}
        </Text>
      )}

      {loading ? (
        <Flex py={10} justify="center">
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : (
        <>
          <HStack gap={2} mb={4} wrap="wrap">
            {Object.entries(sources).map(([k, v]) => {
              const ok = (v as { ok?: boolean })?.ok;
              return (
                <Badge
                  key={k}
                  colorPalette={ok ? "green" : "gray"}
                  variant="subtle"
                >
                  {k}: {ok ? "ok" : "—"}
                </Badge>
              );
            })}
          </HStack>

          <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} gap={3} mb={6}>
            <Kpi label="iOS installs" value={fmt(kpis.iosInstalls)} />
            <Kpi
              label="Android installs"
              value={fmt(kpis.androidInstallsDaily)}
            />
            <Kpi label="Web users 7d" value={fmt(kpis.webUsers7d)} />
            <Kpi
              label="Store clicks 7d"
              value={fmt(kpis.appDownloadClicks7d)}
            />
            <Kpi label="Reads 7d" value={fmt(kpis.reads7d)} />
            <Kpi label="Subscribers" value={fmt(kpis.subscribersTotal)} />
          </SimpleGrid>

          {data?.briefMarkdown ? (
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              p={{ base: 4, md: 6 }}
            >
              <Markdown>{data.briefMarkdown}</Markdown>
            </Box>
          ) : (
            <Box
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              p={6}
            >
              <Text color="nexzy.gray.100">
                No brief yet.
                {isOwner
                  ? " Click Scan now to run a collection and write the latest brief."
                  : ""}
              </Text>
            </Box>
          )}

          <RecommendationsLedger />
        </>
      )}
    </Box>
  );
}
