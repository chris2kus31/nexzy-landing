"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Badge,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import {
  fetchAiVisibilityScoreboard,
  runAiVisibility,
  type AiScoreboard,
  type AiEngineCell,
} from "@/lib/admin/client";

const pct = (n: number): string => `${Math.round((n ?? 0) * 100)}%`;

function fmtWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Cell({ c }: { c?: AiEngineCell }) {
  if (!c || !c.ok) {
    return (
      <Text fontSize="xs" color="gray.600" title="No answer / errored">
        —
      </Text>
    );
  }
  if (c.cited) {
    return (
      <Badge colorPalette="green" variant="subtle" fontSize="10px">
        Cited{c.position ? ` #${c.position}` : ""}
      </Badge>
    );
  }
  if (c.mentioned) {
    return (
      <Badge colorPalette="yellow" variant="subtle" fontSize="10px">
        Mentioned
      </Badge>
    );
  }
  return (
    <Text fontSize="xs" color="gray.500">
      Absent
    </Text>
  );
}

export default function AiVisibilityPanel({ isOwner }: { isOwner?: boolean }) {
  const [data, setData] = useState<AiScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAiVisibilityScoreboard());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scan = async () => {
    setScanning(true);
    setMsg(null);
    try {
      const r = await runAiVisibility();
      setMsg({
        ok: true,
        text: `Scanned ${r.queries} queries across ${r.engines.length} engine(s) — ${r.rows} checks.`,
      });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Scan failed." });
    } finally {
      setScanning(false);
    }
  };

  const engines = data?.engines ?? [];
  const colW = "128px";

  return (
    <Box>
      <Flex
        justify="space-between"
        align="center"
        mb={2}
        flexWrap="wrap"
        gap={3}
      >
        <Box>
          <Heading size="lg" color="nexzy.white">
            AI Visibility
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            Is Nexzy cited in AI answers? Last scan:{" "}
            {fmtWhen(data?.ranAt ?? null)}
          </Text>
        </Box>
        {isOwner && (
          <Button
            size="sm"
            bg="nexzy.yellow"
            color="nexzy.navy"
            borderRadius="full"
            px={6}
            onClick={scan}
            disabled={scanning}
          >
            {scanning ? "Scanning…" : "Scan now"}
          </Button>
        )}
      </Flex>

      {msg && (
        <Text color={msg.ok ? "green.400" : "red.400"} fontSize="sm" mb={4}>
          {msg.text}
        </Text>
      )}
      {isOwner && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={4}>
          A scan spends API tokens across every configured engine. It runs
          automatically once a month; use “Scan now” to refresh on demand.
        </Text>
      )}

      {loading ? (
        <Flex py={16} justify="center">
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : !data || !data.runId ? (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          p={8}
          textAlign="center"
        >
          <Text color="nexzy.white" mb={1}>
            No scans yet.
          </Text>
          <Text color="nexzy.gray.100" fontSize="sm">
            {isOwner
              ? "Hit “Scan now” to run the first GEO scoreboard."
              : "The first monthly scan hasn’t run yet."}
          </Text>
        </Box>
      ) : (
        <>
          {/* Per-engine summary */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4} mb={6}>
            {data.summary.map((e) => (
              <Box
                key={e.key}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="xl"
                p={4}
                opacity={e.configured ? 1 : 0.5}
              >
                <Text color="nexzy.white" fontWeight="700" fontSize="sm" mb={1}>
                  {e.label}
                </Text>
                {e.configured ? (
                  <>
                    <Text color="nexzy.gold" fontSize="2xl" fontWeight="800">
                      {pct(e.citedRate)}
                    </Text>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      cited · {pct(e.mentionRate)} mentioned · {e.answered}{" "}
                      answered
                    </Text>
                  </>
                ) : (
                  <Text color="gray.500" fontSize="xs">
                    Not configured (no API key)
                  </Text>
                )}
              </Box>
            ))}
          </SimpleGrid>

          {/* Per-query scoreboard */}
          <Box overflowX="auto">
            <Box minW={`${360 + engines.length * 128}px`}>
              <HStack
                gap={0}
                borderBottom="1px solid"
                borderColor="whiteAlpha.200"
                pb={2}
                mb={1}
              >
                <Text
                  flex="1"
                  minW="240px"
                  color="nexzy.gray.100"
                  fontSize="xs"
                >
                  Query
                </Text>
                {engines.map((e) => (
                  <Text
                    key={e.key}
                    minW={colW}
                    color="nexzy.gray.100"
                    fontSize="xs"
                    textAlign="center"
                  >
                    {e.label}
                  </Text>
                ))}
              </HStack>
              {data.rows.map((row) => (
                <HStack
                  key={row.query}
                  gap={0}
                  py={2}
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.100"
                >
                  <Text
                    flex="1"
                    minW="240px"
                    color="nexzy.white"
                    fontSize="sm"
                    pr={3}
                    lineClamp={1}
                  >
                    {row.query}
                  </Text>
                  {engines.map((e) => (
                    <Flex key={e.key} minW={colW} justify="center">
                      <Cell c={row.engines[e.key]} />
                    </Flex>
                  ))}
                </HStack>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
