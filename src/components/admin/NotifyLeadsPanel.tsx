"use client";

import { useEffect, useState } from "react";
import { Box, HStack, VStack, Heading, Text, Button } from "@chakra-ui/react";
import {
  getNotifyLeads,
  skipNotifyLead,
  type NotifyLead,
} from "@/lib/admin/client";

/**
 * Notify → Leads. Candidate notifications surfaced when an article is published
 * (best practice: curate here — not every publish should become a push).
 * Generate → send lands in a later phase; for now you can review + skip.
 */
export default function NotifyLeadsPanel() {
  const [leads, setLeads] = useState<NotifyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getNotifyLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const skip = async (id: string) => {
    setBusy(id);
    try {
      await skipNotifyLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box maxW="720px">
      <HStack justify="space-between" mb={1}>
        <Heading size="md" color="nexzy.white">
          Leads
        </Heading>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.gray.100"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={load}
          loading={loading}
        >
          Refresh
        </Button>
      </HStack>
      <Text fontSize="sm" color="whiteAlpha.600" mb={4}>
        Candidate notifications from newly published articles. Curate here —
        generating a push from a lead lands in the next build.
      </Text>

      {loading ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          Loading leads…
        </Text>
      ) : leads.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          No leads yet. Publish an article (with NEXZY_NOTIFY_ENABLED=true) and
          it will appear here.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {leads.map((l) => (
            <Box
              key={l.id}
              borderWidth="1px"
              borderColor={l.featured ? "orange.400" : "whiteAlpha.200"}
              borderRadius="8px"
              bg="whiteAlpha.50"
              p={3}
            >
              <HStack justify="space-between" align="start" gap={3}>
                <VStack align="start" gap={1} flex={1} minW={0}>
                  <HStack gap={2} wrap="wrap">
                    {l.featured && (
                      <Text fontSize="10px" fontWeight="700" color="orange.300">
                        ★ FEATURED
                      </Text>
                    )}
                    {l.trendScore > 0 && (
                      <Text fontSize="10px" color="whiteAlpha.500">
                        trend {l.trendScore}
                      </Text>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="nexzy.white" fontWeight="600">
                    {l.headline}
                  </Text>
                  {l.whyItMatters && (
                    <Text fontSize="xs" color="whiteAlpha.600" lineClamp={2}>
                      {l.whyItMatters}
                    </Text>
                  )}
                </VStack>
                <VStack gap={2}>
                  <Button
                    size="xs"
                    disabled
                    title="Generate → send lands in the next build"
                    bg="nexzy.blue"
                    color="white"
                    opacity={0.5}
                  >
                    Generate
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    color="nexzy.gray.100"
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => skip(l.id)}
                    loading={busy === l.id}
                  >
                    Skip
                  </Button>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
