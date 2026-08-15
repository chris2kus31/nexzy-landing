"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Text,
  Button,
  Badge,
  Link,
  Spinner,
} from "@chakra-ui/react";
import {
  getPollAnalytics,
  getPollDetail,
  type PollAnalytics,
  type PollListItem,
  type PollDetail,
} from "@/lib/admin/client";
import { beatLabel } from "@/lib/blog/beats";
import { publicPathForType } from "@/lib/blog/publicPath";
import { num, Metric, SectionCard, Bar, BarList, Pager } from "./analyticsUi";

const LIMIT = 20;

function timeAgo(iso: string | null): string {
  if (!iso) return "no votes yet";
  const d = new Date(iso).getTime();
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** The per-option split shown on every poll card (uses the current tally). */
function OptionSplit({ item }: { item: PollListItem }) {
  const max = Math.max(...item.options.map((o) => o.votes), 1);
  const leadIdx = item.options.reduce(
    (best, o, i, arr) => (o.votes > arr[best].votes ? i : best),
    0,
  );
  return (
    <VStack align="stretch" gap={2} mt={3}>
      {item.options.map((o, i) => (
        <Bar
          key={i}
          label={`${o.label}  ·  ${o.pct}%`}
          value={o.votes}
          max={max}
          emphasize={i === leadIdx && item.totalVotes > 0}
          accent={i === leadIdx ? "nexzy.blue" : "whiteAlpha.400"}
        />
      ))}
    </VStack>
  );
}

/** Expanded drill-down for one poll: geo, signed-in split, votes-over-time. */
function PollDrillDown({ postId }: { postId: string }) {
  const [detail, setDetail] = useState<PollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPollDetail(postId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError((e as Error)?.message || "Failed."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <Flex justify="center" py={6}>
        <Spinner color="nexzy.blue" />
      </Flex>
    );
  }
  if (error || !detail) {
    return (
      <Text color="red.300" fontSize="sm" mt={3}>
        {error || "No detail."}
      </Text>
    );
  }

  const tlMax = Math.max(...detail.timeline.map((t) => t.votes), 1);
  const signedPct = detail.loggedVotes
    ? Math.round((detail.signedInVotes / detail.loggedVotes) * 100)
    : 0;

  return (
    <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
        <Metric label="Logged votes" value={num(detail.loggedVotes)} />
        <Metric label="Unique voters" value={num(detail.uniqueVoters)} />
        <Metric
          label="Signed-in"
          value={`${signedPct}%`}
          sub={`${num(detail.signedInVotes)} of ${num(detail.loggedVotes)}`}
        />
        <Metric label="Changed vote" value={num(detail.changedVoters)} />
      </SimpleGrid>

      <Text color="nexzy.gray.100" fontSize="xs" mb={4} opacity={0.8}>
        Tallies above are logged since vote-tracking launched. The option bars
        use the article&apos;s full running count (which includes any votes from
        before tracking).
      </Text>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
        <SectionCard title="Votes · last 30 days">
          {detail.timeline.length === 0 ? (
            <Text color="nexzy.gray.100" fontSize="sm">
              No votes in the last 30 days.
            </Text>
          ) : (
            <Flex align="flex-end" gap="3px" h="90px">
              {detail.timeline.map((t) => (
                <Box
                  key={t.day}
                  flex="1"
                  minW="3px"
                  bg="nexzy.blue"
                  borderRadius="sm"
                  h={`${Math.max(4, (t.votes / tlMax) * 100)}%`}
                  title={`${t.day}: ${t.votes}`}
                />
              ))}
            </Flex>
          )}
        </SectionCard>

        <SectionCard title="Top countries">
          <BarList
            rows={detail.countries.map((c) => ({
              label: c.country,
              value: c.votes,
            }))}
            emptyText="No geo data yet."
          />
        </SectionCard>
      </SimpleGrid>
    </Box>
  );
}

function PollCard({ item }: { item: PollListItem }) {
  const [open, setOpen] = useState(false);
  const href = `${publicPathForType(item.type)}/${item.slug}`;
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" gap={3} wrap="wrap" mb={1}>
        <HStack gap={2} wrap="wrap">
          <Badge colorPalette="blue" variant="subtle">
            {beatLabel(item.beat) || item.type}
          </Badge>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            color="nexzy.white"
            fontWeight="600"
            fontSize="sm"
            lineClamp={1}
            _hover={{ color: "nexzy.lightBlue" }}
          >
            {item.title}
          </Link>
        </HStack>
        <Text color="nexzy.gray.100" fontSize="xs" flexShrink={0}>
          {timeAgo(item.lastVoteAt)}
        </Text>
      </Flex>

      <Text color="nexzy.gray.100" fontSize="sm" mb={1}>
        {item.question}
      </Text>

      <OptionSplit item={item} />

      <Flex justify="space-between" align="center" mt={3} wrap="wrap" gap={2}>
        <HStack gap={4} color="nexzy.gray.100" fontSize="xs">
          <Text>
            <Text as="span" color="nexzy.white" fontWeight="700">
              {num(item.totalVotes)}
            </Text>{" "}
            votes
          </Text>
          <Text>
            <Text as="span" color="nexzy.white" fontWeight="700">
              {num(item.uniqueVoters)}
            </Text>{" "}
            unique
          </Text>
          <Text>
            <Text as="span" color="nexzy.white" fontWeight="700">
              {num(item.signedInVoters)}
            </Text>{" "}
            signed-in
          </Text>
        </HStack>
        <Button
          size="xs"
          variant="ghost"
          color="nexzy.lightBlue"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide detail ▲" : "View detail ▼"}
        </Button>
      </Flex>

      {open && <PollDrillDown postId={item.postId} />}
    </Box>
  );
}

export default function PollAnalyticsPanel() {
  const [data, setData] = useState<PollAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);

  const load = async (nextOffset = offset) => {
    setRefreshing(true);
    try {
      const d = await getPollAnalytics(LIMIT, nextOffset);
      setData(d);
      setOffset(nextOffset);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Flex justify="center" py={10}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }
  if (error) {
    return (
      <Text color="red.300" fontSize="sm">
        {error}
      </Text>
    );
  }
  if (!data) return null;

  const o = data.overview;

  return (
    <VStack align="stretch" gap={5}>
      <Flex justify="flex-end">
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => load(offset)}
          loading={refreshing}
          loadingText="Refreshing…"
        >
          ↻ Refresh
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3}>
        <Metric label="Polls live" value={num(o.totalPolls)} />
        <Metric label="Votes logged" value={num(o.loggedVotes)} />
        <Metric label="Unique voters" value={num(o.uniqueVoters)} />
        <Metric label="Signed-in" value={`${o.signedInPct}%`} />
        <Metric label="Votes · 7d" value={num(o.votes7d)} />
        <Metric label="Changed pick" value={num(o.changedVotes)} />
      </SimpleGrid>

      {data.items.length === 0 ? (
        <Box
          border="1px dashed"
          borderColor="whiteAlpha.300"
          borderRadius="xl"
          py={10}
          textAlign="center"
        >
          <Text color="nexzy.gray.100" fontSize="sm">
            No polls yet. Add one to any article in the editor and it&apos;ll
            show up here once it collects votes.
          </Text>
        </Box>
      ) : (
        <>
          <VStack align="stretch" gap={3}>
            {data.items.map((item) => (
              <PollCard key={item.postId} item={item} />
            ))}
          </VStack>
          <Pager
            offset={offset}
            limit={LIMIT}
            total={data.total}
            onPage={(n) => load(n)}
            loading={refreshing}
          />
        </>
      )}
    </VStack>
  );
}
