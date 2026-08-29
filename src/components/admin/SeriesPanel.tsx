"use client";

import { useEffect, useState } from "react";
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
import { runSeriesFeature, getSeriesFeatureCounts } from "@/lib/admin/client";

// Curated long-form series — keys must match SERIES_KINDS in the API's
// content-desk.service.ts. `cadence` = the recommended posting rhythm.
const SERIES_KINDS: {
  key: string;
  label: string;
  hint: string;
  cadence: string;
}[] = [
  {
    key: "console_history",
    label: "History of the Console",
    hint: "e.g. subject: “SNES”, “Sega Dreamcast”",
    cadence: "~1 per month",
  },
  {
    key: "console_wars",
    label: "Console Wars",
    hint: "e.g. subject: “SNES vs Genesis”",
    cadence: "1 episode every 2 weeks (during a season)",
  },
  {
    key: "franchise_history",
    label: "Franchise History",
    hint: "e.g. subject: “Metal Gear”, “Final Fantasy”",
    cadence: "~1 per month",
  },
  {
    key: "game_story",
    label: "The Story Of",
    hint: "e.g. subject: “Silent Hill 2”, “id Software”",
    cadence: "~2 per month",
  },
  {
    key: "canceled_games",
    label: "Canceled Games",
    hint: "e.g. subject: “Star Fox 2”, “P.T. / Silent Hills”",
    cadence: "~1 per month",
  },
  {
    key: "whatever_happened",
    label: "Whatever Happened To",
    hint: "e.g. subject: “THQ”, “Tony Hawk”",
    cadence: "~1 per month",
  },
  {
    key: "game_that_killed",
    label: "The Game That Killed",
    hint: "e.g. subject: “38 Studios”, “Ocean Software”",
    cadence: "~1 every 6 weeks (sparingly — highest research bar)",
  },
];

const WRITERS = ["Chuy", "Eli", "Leslie"];

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
  const [arc, setArc] = useState("");
  const [episode, setEpisode] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [writer, setWriter] = useState(WRITERS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCounts = () => {
    getSeriesFeatureCounts()
      .then(setCounts)
      .catch(() => {});
  };
  useEffect(() => {
    loadCounts();
  }, []);

  const active = SERIES_KINDS.find((s) => s.key === kind);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const submit = async () => {
    if (!subject.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const epNum = parseInt(episode, 10);
      const lead = await runSeriesFeature({
        kind,
        subject: subject.trim(),
        facts: facts.trim() || undefined,
        arc: arc.trim() || undefined,
        episode: Number.isFinite(epNum) && epNum > 0 ? epNum : undefined,
        sourceUrls: sourceUrls.trim() || undefined,
        writer,
      });
      setMsg({
        ok: !!lead,
        text: lead
          ? "Draft created — find it in the Review queue. Publish it and it becomes a video lead in Content Studio → Video Leads, where you Generate the long-form script (grounded only in your facts)."
          : "Couldn't create the lead — check the subject isn't empty.",
      });
      loadCounts();
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

      {active && (
        <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={3}>
          <Text color="nexzy.gray.100" fontSize="xs">
            Recommended cadence:{" "}
            <Box as="span" color="nexzy.white">
              {active.cadence}
            </Box>
          </Text>
          <Text color="nexzy.gray.100" fontSize="xs">
            Commissioned:{" "}
            <Box as="span" color="nexzy.white">
              {counts[kind] ?? 0}
            </Box>{" "}
            of this · {total} total
          </Text>
        </Flex>
      )}

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

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Arc (optional — makes this an episode of a multi-part series)
      </Text>
      <Input
        size="sm"
        mb={3}
        value={arc}
        onChange={(e) => setArc(e.currentTarget.value)}
        placeholder='e.g. "Console Wars: The 16-Bit War" — leave blank for a one-off'
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Flex gap={4} wrap="wrap" mb={3}>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Episode # (blank = auto)
          </Text>
          <Input
            size="sm"
            type="number"
            w="120px"
            value={episode}
            onChange={(e) => setEpisode(e.currentTarget.value)}
            placeholder="auto"
            color="nexzy.white"
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.300"
          />
        </Box>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            Writer
          </Text>
          <NativeSelect.Root size="sm" w="140px">
            <NativeSelect.Field
              value={writer}
              onChange={(e) => setWriter(e.currentTarget.value)}
              color="nexzy.white"
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
            >
              {WRITERS.map((w) => (
                <option key={w} value={w} style={{ background: "#0d1526" }}>
                  {w}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Reference URLs (one per line — stored for attribution)
      </Text>
      <Textarea
        size="sm"
        mb={4}
        rows={2}
        value={sourceUrls}
        onChange={(e) => setSourceUrls(e.currentTarget.value)}
        placeholder="https://…"
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
