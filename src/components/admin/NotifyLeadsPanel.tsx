"use client";

import { useEffect, useState } from "react";
import { Box, HStack, VStack, Heading, Text, Button } from "@chakra-ui/react";
import {
  getNotifyLeads,
  skipNotifyLead,
  generateNotifyLead,
  listPersonas,
  type NotifyLead,
  type NotifyDraft,
} from "@/lib/admin/client";
import Paginated from "@/components/admin/Paginated";

/**
 * Notify → Leads. Candidate notifications surfaced when an article is published
 * (best practice: curate here — not every publish should become a push).
 * Click Generate → pick the persona voice → it writes the push copy (playbook +
 * that voice) and hands it to the composer to review + send.
 */
export default function NotifyLeadsPanel({
  onGenerated,
}: {
  onGenerated?: (draft: NotifyDraft) => void;
}) {
  const [leads, setLeads] = useState<NotifyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // Which lead is currently showing the persona chooser.
  const [pickId, setPickId] = useState<string | null>(null);
  // Active writer voices for the chooser (Chuy / Eli / ...).
  const [personas, setPersonas] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    getNotifyLeads()
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    listPersonas()
      .then((ps) => setPersonas(ps.filter((p) => p.active).map((p) => p.name)))
      .catch(() => setPersonas([]));
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

  // Generate push copy in the chosen voice (undefined persona = Auto = the
  // article's own author), then hand the draft to the composer.
  const generate = async (id: string, persona?: string) => {
    setBusy(id);
    try {
      const draft = await generateNotifyLead(id, persona);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setPickId(null);
      onGenerated?.(draft);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const voiceChoices = ["Auto", ...personas];

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
        Candidate notifications from newly published articles. Click Generate,
        pick a voice, and the push copy is written for you — then you review and
        send it in Notify at will.
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
        <Paginated items={leads} pageSize={20}>
          {(pageLeads) => (
            <VStack align="stretch" gap={3}>
              {pageLeads.map((l) => {
                const picking = pickId === l.id;
                const working = busy === l.id;
                return (
                  <Box
                    key={l.id}
                    borderWidth="1px"
                    borderColor={
                      picking
                        ? "nexzy.blue"
                        : l.featured
                          ? "orange.400"
                          : "whiteAlpha.200"
                    }
                    borderRadius="8px"
                    bg="whiteAlpha.50"
                    p={3}
                  >
                    <HStack justify="space-between" align="start" gap={3}>
                      <VStack align="start" gap={1} flex={1} minW={0}>
                        <HStack gap={2} wrap="wrap">
                          {l.featured && (
                            <Text
                              fontSize="10px"
                              fontWeight="700"
                              color="orange.300"
                            >
                              ★ FEATURED
                            </Text>
                          )}
                          {l.trendScore > 0 && (
                            <Text fontSize="10px" color="whiteAlpha.500">
                              trend {l.trendScore}
                            </Text>
                          )}
                        </HStack>
                        <Text
                          fontSize="sm"
                          color="nexzy.white"
                          fontWeight="600"
                        >
                          {l.headline}
                        </Text>
                        {l.whyItMatters && (
                          <Text
                            fontSize="xs"
                            color="whiteAlpha.600"
                            lineClamp={2}
                          >
                            {l.whyItMatters}
                          </Text>
                        )}
                      </VStack>
                      <VStack gap={2}>
                        <Button
                          size="xs"
                          title="Draft a push from this lead and open the composer"
                          bg="nexzy.blue"
                          color="white"
                          _hover={{ bg: "nexzy.blue", opacity: 0.9 }}
                          onClick={() => setPickId(picking ? null : l.id)}
                          disabled={working}
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
                          loading={working && !picking}
                          disabled={working}
                        >
                          Skip
                        </Button>
                      </VStack>
                    </HStack>

                    {picking && (
                      <Box
                        mt={3}
                        pt={3}
                        borderTopWidth="1px"
                        borderColor="whiteAlpha.200"
                      >
                        {working ? (
                          <Text fontSize="sm" color="nexzy.lightBlue">
                            Writing the push copy…
                          </Text>
                        ) : (
                          <>
                            <Text fontSize="xs" color="whiteAlpha.700" mb={2}>
                              Write it in this voice:
                            </Text>
                            <HStack gap={2} wrap="wrap">
                              {voiceChoices.map((name) => (
                                <Button
                                  key={name}
                                  size="xs"
                                  variant="outline"
                                  color="nexzy.white"
                                  borderColor="whiteAlpha.300"
                                  _hover={{
                                    bg: "nexzy.blue",
                                    borderColor: "nexzy.blue",
                                  }}
                                  onClick={() =>
                                    generate(
                                      l.id,
                                      name === "Auto" ? undefined : name,
                                    )
                                  }
                                >
                                  {name === "Auto"
                                    ? "Auto (article author)"
                                    : name}
                                </Button>
                              ))}
                              <Button
                                size="xs"
                                variant="ghost"
                                color="whiteAlpha.600"
                                _hover={{ bg: "whiteAlpha.100" }}
                                onClick={() => setPickId(null)}
                              >
                                Cancel
                              </Button>
                            </HStack>
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </VStack>
          )}
        </Paginated>
      )}
    </Box>
  );
}
