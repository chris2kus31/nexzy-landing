"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Flex, VStack, Heading, Text, Spinner } from "@chakra-ui/react";
import {
  getAudienceProfile,
  refreshAudienceProfile,
  type AudienceProfile,
} from "@/lib/admin/client";
import { AudiencePanel } from "@/components/admin/LeadsPanel";

const CAD_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  x: "X",
};
const CAD_ORDER = ["youtube", "tiktok", "instagram", "facebook", "threads", "x"];

const TREND_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  increase: { icon: "↑", color: "green.300", label: "scale up" },
  hold: { icon: "→", color: "nexzy.lightBlue", label: "hold" },
  reduce: { icon: "↓", color: "orange.300", label: "ease off" },
  insufficient: { icon: "•", color: "whiteAlpha.500", label: "learning" },
};

type Cad = {
  currentPerWeek: number;
  recommendedPerWeek: number;
  priorPerWeek: number;
  trend: string;
  rationale: string;
  source: string;
  sampleWeeks: number;
  weeks: { week: string; posts: number; reach: number }[];
};

function WeekBars({
  weeks,
}: {
  weeks: { week: string; posts: number; reach: number }[];
}) {
  const max = Math.max(1, ...weeks.map((w) => w.posts));
  return (
    <Flex align="flex-end" gap={1} h="26px" title="posts per week">
      {weeks.map((w) => (
        <Box
          key={w.week}
          w="9px"
          h={`${Math.max(3, (w.posts / max) * 26)}px`}
          bg="nexzy.blue"
          borderRadius="sm"
        />
      ))}
    </Flex>
  );
}

function CadencePanel({ cadence }: { cadence?: AudienceProfile["cadence"] }) {
  const rows = CAD_ORDER.map((p) => {
    const c = cadence?.perPlatform?.[p];
    return c ? { p, ...(c as Cad) } : null;
  }).filter((x): x is { p: string } & Cad => x !== null);

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
    >
      <Text color="nexzy.white" fontSize="sm" fontWeight="700" mb={1}>
        📈 How much to post — from YOUR data
      </Text>
      <Text color="whiteAlpha.500" fontSize="10px" mb={3}>
        Your own weekly reach decides this. Best-practice is only the starting
        guess until your data has enough to say otherwise.
      </Text>

      {rows.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="xs">
          Once you&apos;ve posted across a few weeks, this shows the cadence your
          own reach actually supports per platform. Hit Refresh after you have
          some history.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {rows.map((r) => {
            const t = TREND_META[r.trend] ?? TREND_META.insufficient;
            const isData = r.source === "data";
            return (
              <Box
                key={r.p}
                borderTop="1px solid"
                borderColor="whiteAlpha.100"
                pt={3}
                _first={{ borderTop: "none", pt: 0 }}
              >
                <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                  <Flex align="center" gap={2} minW="150px">
                    <Text
                      color={t.color}
                      fontWeight="700"
                      fontSize="lg"
                      w="14px"
                      textAlign="center"
                    >
                      {t.icon}
                    </Text>
                    <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                      {CAD_LABEL[r.p] ?? r.p}
                    </Text>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      now{" "}
                      <Text as="span" color="nexzy.white" fontWeight="700">
                        {r.currentPerWeek}/wk
                      </Text>
                      {" → "}
                      <Text as="span" color="nexzy.white" fontWeight="700">
                        {r.recommendedPerWeek}/wk
                      </Text>{" "}
                      ({t.label})
                    </Text>
                  </Flex>
                  <Flex align="center" gap={3}>
                    <WeekBars weeks={r.weeks} />
                    <Text
                      fontSize="10px"
                      fontWeight="700"
                      color={isData ? "green.300" : "whiteAlpha.500"}
                      minW="92px"
                      textAlign="right"
                    >
                      {isData
                        ? `● your data (${r.sampleWeeks} wks)`
                        : "best-practice"}
                    </Text>
                  </Flex>
                </Flex>
                <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
                  {r.rationale}
                </Text>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

/**
 * Audience and cadence — the cohesive analytics home under Content Studio: who
 * the audience is, when they are active (moved from Leads), and how much OUR OWN
 * data says to post per platform.
 */
export default function AudienceInsightsPanel({
  isOwner,
}: {
  isOwner: boolean;
}) {
  const [audience, setAudience] = useState<AudienceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAudienceProfile()
      .then(setAudience)
      .catch(() => setAudience(null))
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setAudience(await refreshAudienceProfile());
    } catch {
      /* leave as-is on failure */
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Audience &amp; cadence
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Who your audience is, when they&apos;re active, and how much your own
          data says to post — pulled from your real accounts.
        </Text>
      </Box>
      <AudiencePanel
        audience={audience}
        isOwner={isOwner}
        onRefresh={refresh}
        busy={busy}
      />
      <CadencePanel cadence={audience?.cadence} />
    </VStack>
  );
}
