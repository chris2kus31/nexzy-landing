"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
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
  type GrowthBriefResponse,
  type GrowthBriefMeta,
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
      await runGrowth();
      setSelectedDay(null);
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
        </>
      )}
    </Box>
  );
}
