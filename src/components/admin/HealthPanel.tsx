"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { getHealth, type AdminHealth } from "@/lib/admin/client";

function money(n: number): string {
  return `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text color="nexzy.white" fontWeight="700" fontSize="lg" lineHeight="1.1">
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
    </Box>
  );
}

/** AI cost + error snapshot from agent_runs. Self-fetches on mount. */
export default function HealthPanel() {
  const [data, setData] = useState<AdminHealth | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(setData)
      .catch((e) =>
        setError((e as Error)?.message || "Failed to load health."),
      );
  }, []);

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
      mt={8}
    >
      <Flex align="baseline" justify="space-between" mb={4}>
        <Heading size="md" color="nexzy.white">
          Pipeline health
        </Heading>
        {data && (
          <Text color="nexzy.gray.100" fontSize="xs">
            last run {timeAgo(data.lastRunAt)}
          </Text>
        )}
      </Flex>

      {error ? (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      ) : !data ? (
        <Flex justify="center" py={6}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={5}>
            <Metric label="AI cost · 24h" value={money(data.last24h.cost)} />
            <Metric label="Errors · 24h" value={String(data.last24h.errors)} />
            <Metric label="AI cost · 7d" value={money(data.last7d.cost)} />
            <Metric label="Errors · 7d" value={String(data.last7d.errors)} />
          </SimpleGrid>

          {data.byAgent.length > 0 && (
            <Box mb={data.recentErrors.length > 0 ? 5 : 0}>
              <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                By agent (last 7 days)
              </Text>
              <Box
                as="table"
                w="full"
                css={{ borderCollapse: "collapse", fontSize: "0.85rem" }}
              >
                <Box as="thead" color="nexzy.gray.100">
                  <Box as="tr" textAlign="left">
                    <Box as="th" py={1} fontWeight="500">
                      Agent
                    </Box>
                    <Box as="th" py={1} fontWeight="500">
                      Runs
                    </Box>
                    <Box as="th" py={1} fontWeight="500">
                      Errors
                    </Box>
                    <Box as="th" py={1} fontWeight="500">
                      Cost
                    </Box>
                  </Box>
                </Box>
                <Box as="tbody" color="nexzy.white">
                  {data.byAgent.map((a) => (
                    <Box as="tr" key={a.agent}>
                      <Box as="td" py={1}>
                        {a.agent}
                      </Box>
                      <Box as="td" py={1}>
                        {a.runs}
                      </Box>
                      <Box
                        as="td"
                        py={1}
                        color={a.errors > 0 ? "red.300" : undefined}
                      >
                        {a.errors}
                      </Box>
                      <Box as="td" py={1}>
                        {money(a.cost)}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {data.recentErrors.length > 0 && (
            <Box>
              <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                Recent errors
              </Text>
              <Box display="flex" flexDirection="column" gap={2}>
                {data.recentErrors.map((e, i) => (
                  <HStack key={i} align="start" gap={2} fontSize="xs">
                    <Text color="red.300" fontWeight="600" minW="70px">
                      {e.agent}
                    </Text>
                    <Text color="nexzy.gray.100" lineClamp={2}>
                      {e.error || "(no message)"}
                    </Text>
                  </HStack>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
