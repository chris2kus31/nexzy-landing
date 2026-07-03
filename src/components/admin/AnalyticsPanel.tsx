"use client";

import { useEffect, useState } from "react";
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
  Link,
} from "@chakra-ui/react";
import {
  getContentAnalytics,
  getCostAnalytics,
  COST_CSV_URL,
  type ContentAnalytics,
  type CostAnalytics,
  type TopArticle,
  type CostBreakdownRow,
} from "@/lib/admin/client";
import { beatLabel } from "@/lib/blog/beats";
import HealthPanel from "./HealthPanel";

type Section = "content" | "cost" | "health";

function SegButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      borderRadius="md"
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      fontWeight={active ? "700" : "500"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
      px={4}
    >
      {label}
    </Button>
  );
}

function usd(n: number): string {
  if (!n || n <= 0) return "$0";
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function num(n: number): string {
  return (n ?? 0).toLocaleString();
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Box bg="whiteAlpha.50" borderRadius="lg" px={4} py={3}>
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
      {sub && (
        <Text color="nexzy.gray.100" fontSize="xs" opacity={0.7} mt={0.5}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Heading
        size="xs"
        color="nexzy.gray.100"
        mb={3}
        textTransform="uppercase"
      >
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function TopList({ items }: { items: TopArticle[] }) {
  if (items.length === 0) {
    return (
      <Text color="nexzy.gray.100" fontSize="sm">
        No reads yet.
      </Text>
    );
  }
  return (
    <VStack align="stretch" gap={2}>
      {items.map((a, i) => (
        <HStack key={a.slug} gap={3} align="flex-start">
          <Text color="nexzy.blue" fontWeight="700" fontSize="sm" minW="16px">
            {i + 1}
          </Text>
          <Box flex={1} minW={0}>
            <Link
              href={`/blog/${a.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.white"
              fontSize="sm"
              lineClamp={1}
              _hover={{ color: "nexzy.lightBlue" }}
            >
              {a.title}
            </Link>
            <Text color="nexzy.gray.100" fontSize="xs">
              {beatLabel(a.beat)}
            </Text>
          </Box>
          <Text color="nexzy.gray.100" fontSize="sm" fontWeight="600">
            {num(a.reads)}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

function Breakdown({
  rows,
  money,
}: {
  rows: CostBreakdownRow[];
  money?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Text color="nexzy.gray.100" fontSize="sm">
        No data.
      </Text>
    );
  }
  const max = Math.max(...rows.map((r) => r.cost), 0.000001);
  return (
    <VStack align="stretch" gap={2}>
      {rows.map((r) => (
        <Box key={r.key}>
          <Flex justify="space-between" mb={1}>
            <Text color="nexzy.white" fontSize="sm" lineClamp={1}>
              {r.key}
            </Text>
            <Text color="nexzy.gray.100" fontSize="sm">
              {money ? usd(r.cost) : num(r.cost)}{" "}
              <Text as="span" opacity={0.6} fontSize="xs">
                · {num(r.runs)} runs
              </Text>
            </Text>
          </Flex>
          <Box
            h="4px"
            bg="whiteAlpha.100"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="full"
              bg="nexzy.blue"
              w={`${Math.max(3, (r.cost / max) * 100)}%`}
            />
          </Box>
        </Box>
      ))}
    </VStack>
  );
}

export default function AnalyticsPanel() {
  const [content, setContent] = useState<ContentAnalytics | null>(null);
  const [cost, setCost] = useState<CostAnalytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<Section>("content");

  const load = async () => {
    setRefreshing(true);
    try {
      const [c, k] = await Promise.all([
        getContentAnalytics(),
        getCostAnalytics(),
      ]);
      setContent(c);
      setCost(k);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delta =
    cost && cost.prev7d > 0
      ? ((cost.curr7d - cost.prev7d) / cost.prev7d) * 100
      : cost && cost.curr7d > 0
        ? 100
        : 0;
  const up = delta >= 0;

  return (
    <VStack align="stretch" gap={6}>
      {/* Sub-nav: one focused view at a time, keeps this tab from becoming a
          giant scroll. Refresh only applies to the data views, not Health. */}
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        wrap="wrap"
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        p={2}
      >
        <HStack gap={1} wrap="wrap">
          <SegButton
            label="Content"
            active={section === "content"}
            onClick={() => setSection("content")}
          />
          <SegButton
            label="Cost"
            active={section === "cost"}
            onClick={() => setSection("cost")}
          />
          <SegButton
            label="Pipeline health"
            active={section === "health"}
            onClick={() => setSection("health")}
          />
        </HStack>
        {section !== "health" && (
          <Button
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={load}
            loading={refreshing}
            loadingText="Refreshing…"
          >
            ↻ Refresh
          </Button>
        )}
      </Flex>

      {loading && section !== "health" && (
        <Flex justify="center" py={10}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      )}
      {error && section !== "health" && (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      )}

      {section === "health" && <HealthPanel />}

      {/* CONTENT */}
      {section === "content" && content && (
        <Box>
          <SimpleGrid columns={{ base: 3 }} gap={3} mb={4}>
            <Metric label="Reads today" value={num(content.readsToday)} />
            <Metric label="Reads · 7 days" value={num(content.reads7d)} />
            <Metric label="Reads · 30 days" value={num(content.reads30d)} />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4} mb={4}>
            <SectionCard title="Top today">
              <TopList items={content.topToday} />
            </SectionCard>
            <SectionCard title="Top · 7 days">
              <TopList items={content.top7d} />
            </SectionCard>
            <SectionCard title="Top · all time">
              <TopList items={content.topAllTime} />
            </SectionCard>
          </SimpleGrid>
          <SectionCard title="Reads by beat · 30 days">
            {content.byBeat.length === 0 ? (
              <Text color="nexzy.gray.100" fontSize="sm">
                No reads yet.
              </Text>
            ) : (
              <Breakdown
                rows={content.byBeat.map((b) => ({
                  key: beatLabel(b.beat),
                  runs: b.reads,
                  cost: b.reads,
                }))}
              />
            )}
          </SectionCard>
        </Box>
      )}

      {/* COST */}
      {section === "cost" && cost && (
        <Box>
          <Flex align="center" justify="flex-end" mb={3} wrap="wrap" gap={2}>
            <Link
              href={COST_CSV_URL}
              px={3}
              py={1.5}
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
              fontSize="xs"
              fontWeight="600"
              _hover={{ bg: "whiteAlpha.100", textDecoration: "none" }}
            >
              ↓ Export CSV
            </Link>
          </Flex>
          <SimpleGrid columns={{ base: 2, md: 5 }} gap={3} mb={4}>
            <Metric label="Today" value={usd(cost.costToday)} />
            <Metric label="7 days" value={usd(cost.cost7d)} />
            <Metric label="30 days" value={usd(cost.cost30d)} />
            <Metric label="Month to date" value={usd(cost.costMtd)} />
            <Metric
              label="Projected month"
              value={usd(cost.projectedMonth)}
              sub="at current pace"
            />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mb={4}>
            <Metric
              label="Cost / published article · 30d"
              value={usd(cost.costPerArticle30d)}
              sub={`${num(cost.publishedArticles30d)} published`}
            />
            <Box bg="whiteAlpha.50" borderRadius="lg" px={4} py={3}>
              <HStack gap={2} align="baseline">
                <Text
                  color="nexzy.white"
                  fontSize="2xl"
                  fontWeight="700"
                  lineHeight="1.1"
                >
                  {usd(cost.curr7d)}
                </Text>
                <Text
                  color={up ? "red.300" : "green.300"}
                  fontSize="sm"
                  fontWeight="600"
                >
                  {up ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
                </Text>
              </HStack>
              <Text color="nexzy.gray.100" fontSize="xs">
                Last 7 days vs prior 7 ({usd(cost.prev7d)})
              </Text>
            </Box>
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4} mb={4}>
            <SectionCard title="By model · 30d">
              <Breakdown rows={cost.byModel} money />
            </SectionCard>
            <SectionCard title="By agent · 30d">
              <Breakdown rows={cost.byAgent} money />
            </SectionCard>
            <SectionCard title="By beat · 30d">
              <Breakdown rows={cost.byBeat} money />
            </SectionCard>
          </SimpleGrid>
          <SectionCard title="Priciest recent runs">
            {cost.priciestRuns.length === 0 ? (
              <Text color="nexzy.gray.100" fontSize="sm">
                No runs yet.
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {cost.priciestRuns.map((r, i) => (
                  <Flex key={i} justify="space-between" gap={3}>
                    <Text color="nexzy.white" fontSize="sm" lineClamp={1}>
                      {r.agent}
                      <Text as="span" color="nexzy.gray.100">
                        {" "}
                        · {r.model || "—"}
                      </Text>
                    </Text>
                    <HStack gap={3} flexShrink={0}>
                      <Text color="nexzy.gray.100" fontSize="xs">
                        {new Date(r.at).toLocaleDateString()}
                      </Text>
                      <Text color="nexzy.white" fontSize="sm" fontWeight="600">
                        {usd(r.cost)}
                      </Text>
                    </HStack>
                  </Flex>
                ))}
              </VStack>
            )}
          </SectionCard>
        </Box>
      )}
    </VStack>
  );
}
