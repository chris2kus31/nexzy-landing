"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  getRewindLeads,
  commissionRewind,
  pasteRewind,
  getWriterNames,
  AuthError,
  type RewindLead,
} from "@/lib/admin/client";

const REWIND_AUTHORS = ["Chuy", "Leslie", "Eli"];

/** Weight heat — a decision-support signal, the human still picks the hero. */
function heat(weight: number): string {
  if (weight >= 75) return "red.400";
  if (weight >= 50) return "orange.400";
  if (weight >= 30) return "yellow.400";
  return "whiteAlpha.400";
}

/**
 * Rewind Leads board — mirrors the newsroom Leads flow. Pick a verified "on this
 * day" event and commission an episode in a persona voice; it lands in the
 * existing Review queue. Owner-gated for commissioning + paste (spend/writes).
 */
export default function RewindPanel({ isOwner }: { isOwner?: boolean }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [leads, setLeads] = useState<RewindLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authors, setAuthors] = useState<string[]>(REWIND_AUTHORS);

  const [pasteText, setPasteText] = useState("");
  const [pasting, setPasting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLeads(await getRewindLeads({ month, day, verifiedOnly }));
    } catch (e) {
      if (e instanceof AuthError) return;
      setError((e as Error).message);
      setLeads([]);
    }
  }, [month, day, verifiedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    getWriterNames()
      .then((n) => setAuthors(n.length ? n : REWIND_AUTHORS))
      .catch(() => {});
  }, []);

  const commission = useCallback(async (id: string, author: string) => {
    setBusyId(id);
    setMsg(null);
    try {
      await commissionRewind({ eventId: id, author, noImage: true });
      setLeads((cur) => (cur ? cur.filter((l) => l.id !== id) : cur));
      setMsg("Queued — the draft will appear in the Review queue shortly.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  const doPaste = useCallback(async () => {
    if (!pasteText.trim()) return;
    setPasting(true);
    setMsg(null);
    try {
      const r = await pasteRewind({ text: pasteText, month, day });
      setMsg(`Parsed ${r.seen} rows (${r.newEvents} new).`);
      setPasteText("");
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setPasting(false);
    }
  }, [pasteText, month, day, load]);

  return (
    <VStack align="stretch" gap={5}>
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Rewind — On This Day
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Pick a moment for {month}/{day} and write it up in a persona voice.
          Verified events (2+ sources agree) show first.
        </Text>
      </Box>

      <HStack gap={3} flexWrap="wrap">
        <HStack gap={1}>
          <Text color="nexzy.gray.100" fontSize="sm">
            Month
          </Text>
          <Input
            size="sm"
            w="16"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            value={String(month)}
            onChange={(e) => setMonth(parseInt(e.target.value || "0", 10) || 1)}
          />
          <Text color="nexzy.gray.100" fontSize="sm">
            Day
          </Text>
          <Input
            size="sm"
            w="16"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            value={String(day)}
            onChange={(e) => setDay(parseInt(e.target.value || "0", 10) || 1)}
          />
        </HStack>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          onClick={() => setVerifiedOnly((v) => !v)}
        >
          {verifiedOnly ? "☑" : "☐"} Verified only
        </Button>
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </HStack>

      {isOwner && (
        <Box
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          p={3}
        >
          <Text color="nexzy.white" fontSize="sm" fontWeight="600" mb={2}>
            Paste an “On This Day” block (facts only — re-verified against
            Wikidata)
          </Text>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "1989 37 years ago\n[Game](url) was released\nNES version (Japan)"
            }
            rows={4}
            color="nexzy.white"
            borderColor="whiteAlpha.300"
          />
          <HStack mt={2}>
            <Button
              size="sm"
              bg="nexzy.blue"
              color="white"
              onClick={doPaste}
              loading={pasting}
              loadingText="Parsing…"
            >
              Parse &amp; add to {month}/{day}
            </Button>
          </HStack>
        </Box>
      )}

      {msg && (
        <Text color="nexzy.gray.100" fontSize="sm">
          {msg}
        </Text>
      )}
      {error && (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      )}

      {leads === null ? (
        <Flex justify="center" py={8}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : leads.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No leads for {month}/{day}. Paste a block above, or run the Wikidata
          backfill.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {leads.map((l) => (
            <RewindLeadCard
              key={l.id}
              lead={l}
              authors={authors}
              isOwner={isOwner}
              busy={busyId === l.id}
              onWrite={commission}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}

function RewindLeadCard({
  lead,
  authors,
  isOwner,
  busy,
  onWrite,
}: {
  lead: RewindLead;
  authors: string[];
  isOwner?: boolean;
  busy: boolean;
  onWrite: (id: string, author: string) => void;
}) {
  const [author, setAuthor] = useState(authors[0] || "Chuy");
  const yearsAgo = lead.canonicalYear
    ? new Date().getFullYear() - lead.canonicalYear
    : null;

  return (
    <Flex
      justify="space-between"
      align="flex-start"
      gap={4}
      border="1px solid"
      borderColor={lead.weight >= 60 ? "orange.400/40" : "whiteAlpha.200"}
      borderRadius="lg"
      p={3}
    >
      <Box>
        <HStack gap={2} mb={1} flexWrap="wrap">
          <Text fontFamily="mono" fontSize="10px" color={heat(lead.weight)}>
            {lead.weight} ●
          </Text>
          <Text
            fontSize="10px"
            color="nexzy.gray.100"
            textTransform="uppercase"
          >
            {lead.category.replace(/_/g, " ")}
          </Text>
          {lead.verified ? (
            <Text fontSize="10px" color="green.300">
              ✓ verified
            </Text>
          ) : (
            <Text fontSize="10px" color="yellow.300">
              unverified
            </Text>
          )}
          <Text fontSize="10px" color="nexzy.gray.100">
            {lead.confidence} source{lead.confidence === 1 ? "" : "s"}
          </Text>
        </HStack>
        <Text color="nexzy.white" fontWeight="600">
          {lead.canonicalTitle}
        </Text>
        <Text color="nexzy.gray.100" fontSize="xs">
          {lead.canonicalYear ?? "—"}
          {yearsAgo ? ` · ${yearsAgo} years ago` : ""} · {lead.canonicalRegion}
        </Text>
        {lead.blurb && (
          <Text color="nexzy.gray.100" fontSize="xs" mt={1} lineClamp={2}>
            {lead.blurb}
          </Text>
        )}
      </Box>

      {isOwner && (
        <VStack align="stretch" gap={1} minW="40">
          <Text fontSize="10px" color="nexzy.gray.100">
            Write as
          </Text>
          <HStack gap={1} flexWrap="wrap">
            {authors.map((a) => (
              <Button
                key={a}
                size="xs"
                variant={author === a ? "solid" : "outline"}
                bg={author === a ? "nexzy.blue" : "transparent"}
                color={author === a ? "white" : "nexzy.gray.100"}
                borderColor="whiteAlpha.300"
                onClick={() => setAuthor(a)}
              >
                {a}
              </Button>
            ))}
          </HStack>
          <Button
            size="sm"
            bg="nexzy.blue"
            color="white"
            onClick={() => onWrite(lead.id, author)}
            loading={busy}
            loadingText="Queuing…"
          >
            Write about this
          </Button>
        </VStack>
      )}
    </Flex>
  );
}
