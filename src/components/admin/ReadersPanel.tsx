"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Text,
  Button,
  Input,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { getReadersReport, type ReadersReport } from "@/lib/admin/client";
import { num, Metric, SectionCard } from "./analyticsUi";

/** Plain-English label + color per reader category (matches the API classifier). */
const CATEGORY: Record<
  string,
  { label: string; color: string; human?: boolean }
> = {
  human_web: { label: "Real people · website", color: "#22c55e", human: true },
  app: { label: "Nexzy app (likely)", color: "#FFE14D", human: true },
  social_inapp: {
    label: "People via social / Google app",
    color: "#00E5D0",
    human: true,
  },
  search_crawler: { label: "Search crawlers", color: "#60a5fa" },
  ai_crawler: { label: "AI crawlers", color: "#a78bfa" },
  social_preview: { label: "Link previews", color: "#94a3b8" },
  automation: { label: "Scripts / headless browsers", color: "#f97316" },
  other_bot: { label: "Other bots", color: "#fb7185" },
  owner: { label: "You (admin)", color: "#FF2E88" },
  unknown: { label: "Unknown", color: "#64748b" },
};
const catOf = (c: string) => CATEGORY[c] ?? { label: c, color: "#64748b" };

function todayInBrowser(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Who's reading — breaks a day's counted reads down by WHO sent them (people,
 * the app, search/AI crawlers, scripts, you). Explains the Reads counter; it
 * never changes it. Data starts the day the read log is deployed.
 */
export default function ReadersPanel() {
  const [day, setDay] = useState<string>(todayInBrowser());
  const [data, setData] = useState<ReadersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = async (d: string) => {
    const s = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await getReadersReport(d);
      if (s === seq.current) setData(r);
    } catch (e) {
      if (s === seq.current) setError((e as Error).message);
    } finally {
      if (s === seq.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load(day);
  }, [day]);

  const shiftDay = (delta: number) => {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDay(`${d.getFullYear()}-${m}-${dd}`);
  };

  const maxCat = Math.max(1, ...(data?.byCategory.map((c) => c.count) ?? [1]));
  const maxHour = Math.max(1, ...(data?.hourly ?? [1]));
  const direct = data?.bySource.find((s) => s.via === "direct")?.count ?? 0;

  return (
    <Box>
      {/* Day picker */}
      <HStack gap={2} mb={4} wrap="wrap">
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => shiftDay(-1)}
        >
          ← Prev day
        </Button>
        <Input
          type="date"
          size="sm"
          value={day}
          onChange={(e) => e.target.value && setDay(e.target.value)}
          w="170px"
          bg="whiteAlpha.50"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
        />
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => shiftDay(1)}
          disabled={day >= todayInBrowser()}
        >
          Next day →
        </Button>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => load(day)}
          loading={loading}
        >
          ↻ Refresh
        </Button>
      </HStack>

      {error && (
        <Text color="red.300" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}
      {loading && !data && (
        <Flex justify="center" py={10}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      )}

      {data && !data.available && (
        <SectionCard title="Who's reading">
          <Text color="orange.300" fontSize="sm">
            The read log isn&apos;t set up yet — run the
            <b> article_read_logs</b> migration, then reads start appearing here
            from that moment on.
          </Text>
        </SectionCard>
      )}

      {data && data.available && (
        <Box opacity={loading ? 0.6 : 1}>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
            <Metric
              label="Counter said (Reads)"
              value={num(data.counterReads)}
              sub="what the Reads number recorded"
            />
            <Metric
              label="Real people"
              value={num(data.people)}
              sub="website + app + social apps"
            />
            <Metric
              label="Bots & scripts"
              value={num(
                data.byCategory
                  .filter(
                    (c) => !catOf(c.category).human && c.category !== "owner",
                  )
                  .reduce((a, c) => a + c.count, 0),
              )}
              sub="crawlers, AI, previews, scripts"
            />
            <Metric
              label="Sent directly to the API"
              value={num(direct)}
              sub={direct ? "skipped the website entirely" : "none — good"}
            />
          </SimpleGrid>

          {data.logged === 0 ? (
            <SectionCard title="Who's reading">
              <Text color="nexzy.gray.100" fontSize="sm">
                No reads logged for {data.day}. The log only covers reads from
                the day it was deployed onward.
              </Text>
            </SectionCard>
          ) : (
            <VStack align="stretch" gap={4}>
              {/* Category breakdown */}
              <SectionCard title={`Who sent the ${num(data.logged)} reads`}>
                <VStack align="stretch" gap={2}>
                  {data.byCategory.map((c) => {
                    const meta = catOf(c.category);
                    return (
                      <Box key={c.category}>
                        <Flex justify="space-between" mb={0.5}>
                          <Text fontSize="sm" color="nexzy.white">
                            {meta.label}
                            {meta.human && (
                              <Badge
                                ml={2}
                                colorPalette="green"
                                variant="subtle"
                              >
                                person
                              </Badge>
                            )}
                          </Text>
                          <Text fontSize="sm" color="nexzy.gray.100">
                            {num(c.count)} ·{" "}
                            {Math.round((c.count / data.logged) * 100)}%
                          </Text>
                        </Flex>
                        <Box h="8px" bg="whiteAlpha.100" borderRadius="full">
                          <Box
                            h="8px"
                            borderRadius="full"
                            bg={meta.color}
                            w={`${(c.count / maxCat) * 100}%`}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </VStack>
              </SectionCard>

              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                <SectionCard title="Top senders (by name)">
                  <VStack align="stretch" gap={1}>
                    {data.topAgents.map((a) => (
                      <Flex
                        key={`${a.agent}-${a.category}`}
                        justify="space-between"
                        gap={2}
                      >
                        <HStack gap={2} minW={0}>
                          <Box
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            bg={catOf(a.category).color}
                            flexShrink={0}
                          />
                          <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                            {a.agent}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="nexzy.gray.100">
                          {num(a.count)}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </SectionCard>

                <SectionCard title="Where readers came from">
                  <VStack align="stretch" gap={1}>
                    {data.topReferrers.map((r) => (
                      <Flex key={r.host} justify="space-between" gap={2}>
                        <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                          {r.host}
                        </Text>
                        <Text fontSize="sm" color="nexzy.gray.100">
                          {num(r.count)}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </SectionCard>
              </SimpleGrid>

              {/* Hourly */}
              <SectionCard title="Reads by hour">
                <Flex align="flex-end" gap="3px" h="80px">
                  {data.hourly.map((n, h) => (
                    <Box
                      key={h}
                      flex="1"
                      bg={n ? "nexzy.blue" : "whiteAlpha.100"}
                      h={`${Math.max(4, (n / maxHour) * 100)}%`}
                      borderRadius="sm"
                      title={`${h}:00 — ${n} reads`}
                    />
                  ))}
                </Flex>
                <Flex justify="space-between" mt={1}>
                  {["12a", "6a", "12p", "6p", "11p"].map((l) => (
                    <Text key={l} fontSize="10px" color="nexzy.gray.100">
                      {l}
                    </Text>
                  ))}
                </Flex>
                <Text fontSize="xs" color="nexzy.gray.100" mt={1}>
                  Steady reads all night usually means crawlers; spikes after
                  you post usually mean people.
                </Text>
              </SectionCard>

              {/* Suspicious visitors */}
              {data.suspicious.length > 0 && (
                <SectionCard title="Suspicious visitors (10+ reads in a day)">
                  <VStack align="stretch" gap={1}>
                    {data.suspicious.map((s) => (
                      <Flex key={s.visitor} justify="space-between" gap={2}>
                        <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                          Visitor {s.visitor.slice(0, 6)} · {s.agent}
                          {s.country ? ` · ${s.country}` : ""}
                        </Text>
                        <Text fontSize="sm" color="orange.300">
                          {num(s.count)} reads · {s.articles} articles
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                  <Text fontSize="xs" color="nexzy.gray.100" mt={2}>
                    One visitor reading dozens of articles is almost always a
                    crawler or script, even if it claims to be a normal browser.
                  </Text>
                </SectionCard>
              )}

              {/* Per article */}
              <SectionCard title="By article">
                <Box overflowX="auto">
                  <Box as="table" w="100%" fontSize="sm">
                    <Box as="thead">
                      <Box as="tr" color="nexzy.gray.100">
                        <Box as="th" textAlign="left" py={1}>
                          Article
                        </Box>
                        <Box as="th" textAlign="right">
                          Total
                        </Box>
                        <Box as="th" textAlign="right">
                          People
                        </Box>
                        <Box as="th" textAlign="right">
                          App
                        </Box>
                        <Box as="th" textAlign="right">
                          Bots
                        </Box>
                        <Box as="th" textAlign="right">
                          You
                        </Box>
                      </Box>
                    </Box>
                    <Box as="tbody">
                      {data.byArticle.map((a) => (
                        <Box
                          as="tr"
                          key={a.slug}
                          borderTop="1px solid"
                          borderColor="whiteAlpha.100"
                        >
                          <Box
                            as="td"
                            py={1.5}
                            pr={2}
                            color="nexzy.white"
                            maxW="420px"
                          >
                            <Text lineClamp={1}>{a.title}</Text>
                          </Box>
                          <Box as="td" textAlign="right" color="nexzy.white">
                            {a.total}
                          </Box>
                          <Box as="td" textAlign="right" color="green.300">
                            {a.people}
                          </Box>
                          <Box as="td" textAlign="right" color="yellow.300">
                            {a.app}
                          </Box>
                          <Box as="td" textAlign="right" color="blue.300">
                            {a.bots}
                          </Box>
                          <Box as="td" textAlign="right" color="pink.300">
                            {a.owner}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </SectionCard>

              <Text fontSize="xs" color="nexzy.gray.100">
                &quot;Nexzy app (likely)&quot; is detected from the in-app
                browser&apos;s signature — no app update needed. Other apps that
                open links in a plain web view can occasionally land in that
                bucket too.
              </Text>
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
}
