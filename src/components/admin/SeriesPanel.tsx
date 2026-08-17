"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  NativeSelect,
} from "@chakra-ui/react";
import { FiFilm } from "react-icons/fi";
import { runSeriesFeature } from "@/lib/admin/client";

// Curated long-form series — keys must match SERIES_KINDS in the API's
// content-desk.service.ts.
const SERIES_KINDS: { key: string; label: string; hint: string }[] = [
  {
    key: "console_history",
    label: "History of the Console",
    hint: "e.g. subject: “SNES”, “Sega Dreamcast”",
  },
  {
    key: "console_wars",
    label: "Console Wars",
    hint: "e.g. subject: “SNES vs Genesis”",
  },
  {
    key: "franchise_history",
    label: "Franchise History",
    hint: "e.g. subject: “Metal Gear”, “Final Fantasy”",
  },
  {
    key: "game_story",
    label: "The Story Of",
    hint: "e.g. subject: “Silent Hill 2”, “id Software”",
  },
  {
    key: "canceled_games",
    label: "Canceled Games",
    hint: "e.g. subject: “Star Fox 2”, “P.T. / Silent Hills”",
  },
  {
    key: "whatever_happened",
    label: "Whatever Happened To",
    hint: "e.g. subject: “THQ”, “Tony Hawk”",
  },
  {
    key: "game_that_killed",
    label: "The Game That Killed",
    hint: "e.g. subject: “38 Studios”, “Ocean Software”",
  },
];

/**
 * Commission a curated long-form documentary feature. You pick the series, type
 * the subject, and paste the sourced facts — the writer uses ONLY those facts
 * (the fact-check gate), so it can't invent dates, sales, quotes, or causes.
 * Lands as a video lead in Content Studio → Video Leads. Nothing auto-publishes.
 */
export default function SeriesPanel({ onRan }: { onRan?: () => void }) {
  const [kind, setKind] = useState(SERIES_KINDS[0].key);
  const [subject, setSubject] = useState("");
  const [facts, setFacts] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const active = SERIES_KINDS.find((s) => s.key === kind);

  const submit = async () => {
    if (!subject.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const lead = await runSeriesFeature({
        kind,
        subject: subject.trim(),
        facts: facts.trim() || undefined,
      });
      setMsg({
        ok: !!lead,
        text: lead
          ? "Series feature lead created — find it in Content Studio → Video Leads. Produce it to write the long-form script (grounded only in your facts). You can paste more facts in the steer box at Produce."
          : "Couldn't create the lead — check the subject isn't empty.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not create the series feature.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
      mb={8}
    >
      <Heading size="md" color="nexzy.white" mb={1}>
        Commission a series feature
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Long-form documentary episodes for the curated series. Pick the series,
        type the subject, and paste the sourced facts — the writer uses{" "}
        <Box as="span" color="nexzy.white">
          only
        </Box>{" "}
        those facts (it can&rsquo;t invent dates, sales, quotes, or causes).
        Lands as a lead in{" "}
        <Box as="span" color="nexzy.white">
          Content Studio → Video Leads
        </Box>
        .
      </Text>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Series
      </Text>
      <NativeSelect.Root size="sm" mb={3}>
        <NativeSelect.Field
          value={kind}
          onChange={(e) => setKind(e.currentTarget.value)}
          color="nexzy.white"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.300"
        >
          {SERIES_KINDS.map((s) => (
            <option key={s.key} value={s.key} style={{ background: "#0d1526" }}>
              {s.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Subject {active ? `— ${active.hint}` : ""}
      </Text>
      <Input
        size="sm"
        mb={3}
        value={subject}
        onChange={(e) => setSubject(e.currentTarget.value)}
        placeholder="The subject of the feature"
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Sourced facts (the ONLY facts the writer may use — dates, sales, key
        events, quotes, with sources)
      </Text>
      <Textarea
        size="sm"
        mb={4}
        rows={6}
        value={facts}
        onChange={(e) => setFacts(e.currentTarget.value)}
        placeholder="Paste your researched, sourced facts here. Anything not here won't be stated. You can also add more in the steer box at Produce."
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Flex justify="flex-end">
        <Button
          size="sm"
          colorPalette="purple"
          onClick={submit}
          loading={busy}
          loadingText="Creating…"
          disabled={!subject.trim()}
        >
          <FiFilm /> Commission feature
        </Button>
      </Flex>

      {msg && (
        <Text mt={4} fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
