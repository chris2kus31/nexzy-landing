"use client";
// Admin > Trends > stats: the funnel (views, Try it taps, builds, posts,
// shares, visits back), entries per day, shares by platform, visits by
// source, the most picked games, and entries vs ordinary posts. Funnel
// numbers come from the buffered daily counters (app + website together).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import {
  getTrendStats,
  type AdminTrendStats,
  type TrendCompareSide,
} from "@/lib/admin/client-trends";
import {
  Kpi,
  Section,
  Segmented,
  StatusChip,
  num,
  outlineBtn,
} from "@/components/admin/trends/ui";

type Span = "7" | "14" | "30";

/** Share platforms and visit sources (nexzy-api trend-stats.service). */
const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  facebook: "Facebook",
  threads: "Threads",
  save: "Save image",
  copy: "Copy link",
  other: "Other",
  ig: "Instagram",
  tt: "TikTok",
  fb: "Facebook",
  th: "Threads",
  link: "Direct link",
};
const label = (k: string) => PLATFORM_LABEL[k] ?? k;

const pct = (a: number, b: number) =>
  b > 0 ? `${Math.round((a / b) * 100)}%` : "-";

/** Last `span` UTC days, oldest first, as YYYY-MM-DD. */
function dayKeys(span: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function sumMaps(maps: Array<Record<string, number>>): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const x of maps)
    for (const [k, v] of Object.entries(x ?? {}))
      m.set(k, (m.get(k) ?? 0) + (Number(v) || 0));
  return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}

function Bars({
  rows,
  color,
}: {
  rows: Array<[string, number]>;
  color: string;
}) {
  if (!rows.length)
    return (
      <Text fontSize="sm" color="whiteAlpha.600">
        Nothing yet.
      </Text>
    );
  const max = rows[0][1];
  return (
    <VStack align="stretch" gap={2}>
      {rows.map(([k, v]) => (
        <Flex key={k} align="center" gap={3} fontSize="sm">
          <Text w="100px" color="whiteAlpha.900" flexShrink={0}>
            {label(k)}
          </Text>
          <Box
            flex="1"
            h="12px"
            bg="whiteAlpha.100"
            borderRadius="sm"
            overflow="hidden"
          >
            <Box
              h="100%"
              w={`${(v / max) * 100}%`}
              bg={color}
              borderRadius="sm"
            />
          </Box>
          <Text w="56px" textAlign="right" fontWeight="700" color="nexzy.white">
            {num(v)}
          </Text>
        </Flex>
      ))}
    </VStack>
  );
}

export default function TrendStats({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [span, setSpan] = useState<Span>("14");
  const [data, setData] = useState<AdminTrendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getTrendStats(id, Number(span)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, span]);

  useEffect(() => {
    void load();
  }, [load]);

  const view = useMemo(() => {
    if (!data) return null;
    const byDay = new Map(data.days.map((d) => [d.day, d]));
    const keys = dayKeys(Number(span));
    const series = keys.map((k) => ({
      day: k,
      posts: byDay.get(k)?.posts ?? 0,
    }));
    const total = (f: "views" | "tryTaps" | "builds" | "posts" | "downloads") =>
      data.days.reduce((n, d) => n + (Number(d[f]) || 0), 0);
    const shares = sumMaps(data.days.map((d) => d.shares));
    const visits = sumMaps(data.days.map((d) => d.visits));
    return {
      series,
      views: total("views"),
      tries: total("tryTaps"),
      builds: total("builds"),
      posts: total("posts"),
      shares,
      visits,
      shareTotal: shares.reduce((n, [, v]) => n + v, 0),
      visitTotal: visits.reduce((n, [, v]) => n + v, 0),
    };
  }, [data, span]);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={3}>
          <Button size="sm" {...outlineBtn} onClick={onBack}>
            <FiArrowLeft /> Trends
          </Button>
          <Heading size="md" color="nexzy.white">
            {data ? `#${data.trend.hashtagDisplay} stats` : "Stats"}
          </Heading>
          {data && <StatusChip status={data.trend.status} />}
        </HStack>
        <HStack gap={2}>
          <Segmented<Span>
            options={[
              ["7", "7 days"],
              ["14", "14 days"],
              ["30", "30 days"],
            ]}
            value={span}
            onChange={setSpan}
          />
          <Button size="sm" {...outlineBtn} onClick={onEdit}>
            Edit
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Text color="red.300" mb={3}>
          {error}
        </Text>
      )}
      {loading && !data ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : data && view ? (
        <VStack align="stretch" gap={4}>
          <Flex gap={3} wrap="wrap">
            <Kpi label="Views" value={num(view.views)} />
            <Kpi
              label="Tapped Try it"
              value={num(view.tries)}
              sub={`${pct(view.tries, view.views)} of views`}
            />
            <Kpi
              label="Started building"
              value={num(view.builds)}
              sub={`${pct(view.builds, view.tries)} of tries`}
            />
            <Kpi
              label="Posted"
              value={num(view.posts)}
              sub={`${pct(view.posts, view.builds)} of builders`}
            />
            <Kpi
              label="Shared"
              value={num(view.shareTotal)}
              sub={`${pct(view.shareTotal, view.posts)} of posts`}
            />
            <Kpi
              label="Visits from shares"
              value={num(view.visitTotal)}
              sub={
                view.shareTotal
                  ? `${(view.visitTotal / view.shareTotal).toFixed(1)} per share`
                  : undefined
              }
            />
          </Flex>

          <Box
            display="grid"
            gridTemplateColumns={{ base: "1fr", lg: "1.5fr 1fr" }}
            gap={4}
          >
            <Section
              title="Entries per day"
              sub={`Last ${span} days (UTC). App and website together.`}
            >
              <EntriesChart series={view.series} />
            </Section>
            <Section title="Shares by platform">
              <Bars rows={view.shares} color="nexzy.lightBlue" />
            </Section>
          </Box>

          <Box
            display="grid"
            gridTemplateColumns={{ base: "1fr", lg: "1.5fr 1fr" }}
            gap={4}
          >
            <Section
              title="Most picked"
              sub={`Out of ${num(data.trend.entryCount)} entries, all time`}
            >
              {data.picks.length === 0 ? (
                <Text fontSize="sm" color="whiteAlpha.600">
                  Nothing yet.
                </Text>
              ) : (
                <VStack align="stretch" gap={0}>
                  {data.picks.map((g, i) => (
                    <Flex
                      key={g.id}
                      align="center"
                      gap={3}
                      py={2}
                      borderTopWidth={i ? "1px" : 0}
                      borderColor="whiteAlpha.200"
                      fontSize="sm"
                    >
                      <Text w="22px" color="nexzy.yellow" fontWeight="800">
                        {i + 1}
                      </Text>
                      <Box
                        w="44px"
                        h="26px"
                        borderRadius="sm"
                        bg="whiteAlpha.200"
                        bgImage={
                          g.backgroundImage
                            ? `url(${g.backgroundImage})`
                            : undefined
                        }
                        bgSize="cover"
                        bgPos="center"
                        flexShrink={0}
                      />
                      <Text flex="1" color="nexzy.white" lineClamp={1}>
                        {g.name}
                      </Text>
                      <Text fontWeight="700" color="nexzy.white">
                        {num(g.count)}
                      </Text>
                      <Text w="48px" textAlign="right" color="whiteAlpha.600">
                        {pct(g.count, data.trend.entryCount)}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Section>
            <VStack align="stretch" gap={4}>
              <Section
                title="Visits back from shares"
                sub="People who opened a shared link, by where they came from"
              >
                <Bars rows={view.visits} color="green.400" />
              </Section>
              <Section
                title="Entries vs ordinary posts"
                sub={`Per post, posted in the last ${span} days`}
              >
                <Compare
                  entries={data.compare.entries}
                  posts={data.compare.posts}
                />
              </Section>
            </VStack>
          </Box>
        </VStack>
      ) : null}
    </Box>
  );
}

function EntriesChart({
  series,
}: {
  series: Array<{ day: string; posts: number }>;
}) {
  const max = Math.max(1, ...series.map((s) => s.posts));
  const every = series.length > 14 ? 3 : 1;
  return (
    <Flex
      gap="3px"
      h="170px"
      align="flex-end"
      role="img"
      aria-label={`Entries per day: ${series.map((s) => `${s.day} ${s.posts}`).join(", ")}`}
    >
      {series.map((s, i) => (
        <Flex
          key={s.day}
          flex="1"
          direction="column"
          justify="flex-end"
          align="center"
          gap={1}
          h="100%"
          title={`${s.day}: ${num(s.posts)}`}
        >
          <Box
            w="70%"
            h={`${(s.posts / max) * 140}px`}
            minH={s.posts ? "2px" : 0}
            bg="nexzy.yellow"
            borderTopRadius="sm"
          />
          <Text fontSize="10px" color="whiteAlpha.600" h="12px">
            {i % every === 0 ? Number(s.day.slice(8)) : ""}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

function Compare({
  entries,
  posts,
}: {
  entries: TrendCompareSide;
  posts: TrendCompareSide;
}) {
  const rows: Array<[string, number, number]> = [
    ["Views", entries.views, posts.views],
    ["Hearts", entries.hearts, posts.hearts],
    ["Replies", entries.replies, posts.replies],
  ];
  const f = (n: number) =>
    n >= 10 ? Math.round(n).toLocaleString("en-US") : n.toFixed(1);
  return (
    <Box display="grid" gridTemplateColumns="1.3fr 1fr 1fr" fontSize="sm">
      <Text color="whiteAlpha.600" py={1}>
        {num(entries.posts)} entries / {num(posts.posts)} posts
      </Text>
      <Text color="whiteAlpha.600" py={1}>
        Entries
      </Text>
      <Text color="whiteAlpha.600" py={1}>
        Ordinary posts
      </Text>
      {rows.map(([k, a, b]) => (
        <Box key={k} display="contents">
          <Text
            py={2}
            borderTopWidth="1px"
            borderColor="whiteAlpha.200"
            color="nexzy.white"
          >
            {k}
          </Text>
          <Text
            py={2}
            borderTopWidth="1px"
            borderColor="whiteAlpha.200"
            fontWeight="800"
            color={a > b ? "green.300" : "nexzy.white"}
          >
            {entries.posts ? f(a) : "-"}
          </Text>
          <Text
            py={2}
            borderTopWidth="1px"
            borderColor="whiteAlpha.200"
            fontWeight="700"
            color="nexzy.white"
          >
            {posts.posts ? f(b) : "-"}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
