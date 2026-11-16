"use client";
// Admin > Trends: the list of trends, the editor (with the server-rendered
// live preview) and per-trend stats. Owner-only tab, like Announcements.
// Works while TRENDS_ENABLED is off on the API, so trends can be drafted and
// previewed before launch. Plan: NEXZY_TRENDS_PLAN.md (Phase 2).
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { getUnresolvedGames } from "@/lib/admin/client";
import {
  listTrends,
  type AdminTrend,
  type AdminTrendList,
  type TrendStatus,
} from "@/lib/admin/client-trends";
import TrendEditor from "@/components/admin/trends/TrendEditor";
import TrendStats from "@/components/admin/trends/TrendStats";
import {
  Kpi,
  StatusChip,
  num,
  outlineBtn,
  yellowBtn,
} from "@/components/admin/trends/ui";

type View =
  | { kind: "list" }
  | { kind: "edit"; id: string | null }
  | { kind: "stats"; id: string };

type Filter = "all" | TrendStatus;

/** Short summary of what people do, from the steps. */
export function stepsSummary(t: AdminTrend): string {
  const steps = t.steps?.steps ?? [];
  const pick = steps.find((s) => s.kind === "pickGames");
  const parts: string[] = [];
  if (pick && pick.kind === "pickGames")
    parts.push(
      pick.min === pick.max
        ? `Pick ${pick.max}`
        : `Pick ${pick.min}-${pick.max}`,
    );
  if (steps.some((s) => s.kind === "thisOrThat")) parts.push("This or that");
  if (steps.some((s) => s.kind === "rank")) parts.push("rank");
  if (steps.some((s) => s.kind === "tiers")) parts.push("tiers");
  if (steps.some((s) => s.kind === "reason")) parts.push("reasons");
  const src = t.source?.kind;
  if (src === "library") parts.push("from library");
  if (src === "wishlist") parts.push("from wishlist");
  if (src === "list") parts.push("from a list");
  if (src === "filter") parts.push("filtered");
  return parts.join(", ");
}

export default function TrendsPanel() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [list, setList] = useState<AdminTrendList | null>(null);
  const [requests, setRequests] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([
        listTrends(),
        getUnresolvedGames(1, 0, "user").catch(() => null),
      ]);
      setList(l);
      setRequests(r?.total ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view.kind === "list") void load();
  }, [view.kind, load]);

  if (view.kind === "edit")
    return (
      <TrendEditor
        id={view.id}
        onBack={() => setView({ kind: "list" })}
        onSaved={(id) => setView({ kind: "edit", id })}
        onStats={(id) => setView({ kind: "stats", id })}
      />
    );
  if (view.kind === "stats")
    return (
      <TrendStats
        id={view.id}
        onBack={() => setView({ kind: "list" })}
        onEdit={() => setView({ kind: "edit", id: view.id })}
      />
    );

  const trends = list?.data ?? [];
  const count = (s: TrendStatus) => trends.filter((t) => t.status === s).length;
  const shown =
    filter === "all" ? trends : trends.filter((t) => t.status === filter);
  const filters: ReadonlyArray<readonly [Filter, string]> = [
    ["all", `All ${trends.length}`],
    ["live", `Live ${count("live")}`],
    ["draft", `Draft ${count("draft")}`],
    ["ended", `Ended ${count("ended")}`],
    ["removed", `Removed ${count("removed")}`],
  ];
  const cols = "2.4fr 1fr 1fr 0.9fr 0.8fr 1.4fr 1.1fr";

  return (
    <Box>
      <Flex justify="space-between" align="flex-end" mb={4} gap={3} wrap="wrap">
        <Box>
          <Heading size="md" color="nexzy.white">
            Trends
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600">
            A title plus what people pick. Each trend is a drop: live ones show
            at nexzyapp.com/drops. Nothing shows while TRENDS_ENABLED is off.
          </Text>
        </Box>
        <HStack gap={2}>
          <Button size="sm" {...outlineBtn} asChild>
            <a href="/admin?tab=games&source=user">
              Game requests{requests ? ` (${num(requests)})` : ""}
            </a>
          </Button>
          <Button size="sm" {...outlineBtn} onClick={load} loading={loading}>
            Refresh
          </Button>
          <Button
            size="sm"
            {...yellowBtn}
            onClick={() => setView({ kind: "edit", id: null })}
          >
            <FiPlus /> New trend
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Text color="red.300" mb={3}>
          {error}
        </Text>
      )}

      <Flex gap={3} mb={4} wrap="wrap">
        <Kpi label="Live trends" value={num(count("live"))} />
        <Kpi
          label="Entries today"
          value={num(trends.reduce((n, t) => n + t.entryCountToday, 0))}
        />
        <Kpi label="Shares today" value={num(list?.today.shares ?? 0)} />
        <Kpi
          label="Visits from shares today"
          value={num(list?.today.visits ?? 0)}
        />
      </Flex>

      <HStack gap={2} mb={3} wrap="wrap">
        {filters.map(([key, label]) => (
          <Button
            key={key}
            size="xs"
            borderRadius="full"
            onClick={() => setFilter(key)}
            bg={filter === key ? "whiteAlpha.300" : "transparent"}
            color={filter === key ? "white" : "nexzy.gray.100"}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            {label}
          </Button>
        ))}
      </HStack>

      {!list && loading ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : shown.length === 0 ? (
        <Text color="whiteAlpha.600" py={6}>
          {trends.length === 0
            ? "No trends yet. Start one with New trend."
            : "No trends with that status."}
        </Text>
      ) : (
        <Box
          bg="whiteAlpha.50"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          overflowX="auto"
        >
          <Box minW="860px">
            <Box
              display="grid"
              gridTemplateColumns={cols}
              px={4}
              py={2.5}
              fontSize="11px"
              fontWeight="700"
              letterSpacing="0.06em"
              textTransform="uppercase"
              color="whiteAlpha.600"
            >
              <Text>Trend</Text>
              <Text>Status</Text>
              <Text>Discover</Text>
              <Text>Entries</Text>
              <Text>Today</Text>
              <Text>Steps</Text>
              <Text />
            </Box>
            {shown.map((t) => (
              <Box
                key={t.id}
                display="grid"
                gridTemplateColumns={cols}
                alignItems="center"
                px={4}
                py={3}
                borderTopWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <Box minW={0}>
                  <Text color="nexzy.yellow" fontWeight="800">
                    #{t.hashtagDisplay}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.600" lineClamp={1}>
                    {t.title}
                  </Text>
                </Box>
                <Box>
                  <StatusChip status={t.status} />
                </Box>
                <Text fontSize="sm" color="nexzy.white">
                  {t.featured ? "Featured" : "-"}
                </Text>
                <Text fontSize="sm" fontWeight="700" color="nexzy.white">
                  {num(t.entryCount)}
                </Text>
                <Text fontSize="sm" fontWeight="700" color="nexzy.white">
                  {num(t.entryCountToday)}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.700">
                  {stepsSummary(t)}
                </Text>
                <HStack gap={2} justify="flex-end">
                  <Button
                    size="xs"
                    {...outlineBtn}
                    onClick={() => setView({ kind: "edit", id: t.id })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    {...outlineBtn}
                    onClick={() => setView({ kind: "stats", id: t.id })}
                  >
                    Stats
                  </Button>
                </HStack>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
