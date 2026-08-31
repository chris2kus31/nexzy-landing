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
import { FiTrendingUp } from "react-icons/fi";
import { runCountdown } from "@/lib/admin/client";

// Topic templates — keys must match COUNTDOWN_TEMPLATES in the API's
// content-desk.service.ts. Seasonal ones are flagged in the hint.
const TEMPLATES: { key: string; label: string; hint: string }[] = [
  {
    key: "most_anticipated",
    label: "Most Anticipated Games",
    hint: "upcoming games, ranked by hype",
  },
  {
    key: "highest_rated_year",
    label: "Highest-Rated Games of the Year",
    hint: "this year's best-reviewed, ranked by rating",
  },
  {
    key: "releasing_this_month",
    label: "Games Coming This Month",
    hint: "this month's launches, ranked by anticipation",
  },
  {
    key: "halloween_horror",
    label: "Scariest Games (Halloween)",
    hint: "seasonal — horror, ranked by rating",
  },
  {
    key: "holiday_coop",
    label: "Best Co-op Games (Holidays)",
    hint: "seasonal — co-op/multiplayer, ranked by rating",
  },
];

const WRITERS = ["Chuy", "Eli", "Leslie"];

/**
 * Nexzy Countdown — a WatchMojo-style ranked Top-N video. Two modes:
 *  - Topic mode: pick a template + count and the DB fills it with real games
 *    ranked by the fitting metric (hype / rating / release).
 *  - Bring-your-own mode: paste your own games (2+ lines) + an angle + context;
 *    the DB/template are skipped and it's built from your list.
 * Either way it creates a DRAFT article; publishing it mints the video lead in
 * Content Studio → Video Leads (where you Generate the script).
 */
export default function NexzyCountdownPanel({ onRan }: { onRan?: () => void }) {
  const [template, setTemplate] = useState(TEMPLATES[0].key);
  const [count, setCount] = useState(10);
  const [writer, setWriter] = useState(WRITERS[0]);
  const [angle, setAngle] = useState("");
  const [context, setContext] = useState("");
  const [games, setGames] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const active = TEMPLATES.find((t) => t.key === template);
  const byoCount = games.split(/\r?\n/).filter((l) => l.trim()).length;
  const byo = byoCount >= 2;

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const lead = await runCountdown({
        template,
        count,
        writer,
        angle: angle.trim() || undefined,
        context: context.trim() || undefined,
        games: games.trim() || undefined,
      });
      setMsg({
        ok: !!lead,
        text: lead
          ? "Draft created — find it in the Review queue. Publish it and it becomes a video lead in Content Studio → Video Leads, where you Generate the ranked countdown script (counted down to #1)."
          : byo
            ? "Need at least 2 games in your list to build a countdown."
            : "Not enough games with the needed data for this topic yet (the IGDB enrichment backfill fills hype/ratings in). Try another template, or paste your own list below.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not create the countdown.",
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
        Nexzy Countdown
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        A WatchMojo-style ranked Top-N video. Pick a topic and the games DB
        fills it with{" "}
        <Box as="span" color="nexzy.white">
          real games
        </Box>{" "}
        ranked by the metric that fits — or paste your{" "}
        <Box as="span" color="nexzy.white">
          own list + angle
        </Box>{" "}
        below. Creates a{" "}
        <Box as="span" color="nexzy.white">
          draft article
        </Box>
        ; publish it and it becomes a video lead in Content Studio.
      </Text>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Topic
      </Text>
      <NativeSelect.Root size="sm" mb={2}>
        <NativeSelect.Field
          value={template}
          onChange={(e) => setTemplate(e.currentTarget.value)}
          color="nexzy.white"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.300"
        >
          {TEMPLATES.map((t) => (
            <option key={t.key} value={t.key} style={{ background: "#0d1526" }}>
              {t.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {active && (
        <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
          {active.hint}
        </Text>
      )}

      <Flex gap={4} wrap="wrap" mb={4}>
        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
            How many (5–20)
          </Text>
          <Input
            size="sm"
            type="number"
            min={5}
            max={20}
            w="90px"
            value={count}
            onChange={(e) =>
              setCount(Math.max(5, Math.min(20, Number(e.currentTarget.value))))
            }
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
        Angle{" "}
        <Box as="span" color="whiteAlpha.500">
          (optional — the take the video leads with; also used as the title)
        </Box>
      </Text>
      <Input
        size="sm"
        mb={3}
        placeholder="e.g. The games actually worth your September"
        value={angle}
        onChange={(e) => setAngle(e.currentTarget.value)}
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Context / notes{" "}
        <Box as="span" color="whiteAlpha.500">
          (optional — extra facts the writer may use)
        </Box>
      </Text>
      <Textarea
        size="sm"
        mb={3}
        rows={3}
        placeholder="Anything the script should know — release windows, why each pick matters, tone…"
        value={context}
        onChange={(e) => setContext(e.currentTarget.value)}
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Your games{" "}
        <Box as="span" color="whiteAlpha.500">
          (optional — one per line, “Name — one-line note”. 2+ lines overrides
          the topic + DB and builds from YOUR list, #1 = first line)
        </Box>
      </Text>
      <Textarea
        size="sm"
        mb={1}
        rows={5}
        placeholder={
          "Silksong — the wait is finally over\nHades II — 1.0 at last\nGhost of Yotei — Sucker Punch's next"
        }
        value={games}
        onChange={(e) => setGames(e.currentTarget.value)}
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />
      <Text fontSize="xs" mb={4} color={byo ? "purple.300" : "whiteAlpha.500"}>
        {byo
          ? `Bring-your-own mode: ${byoCount} games — the topic + DB pull are ignored.`
          : "Leave blank to auto-fill from the topic above."}
      </Text>

      <Flex justify="flex-end">
        <Button
          size="sm"
          colorPalette="purple"
          onClick={submit}
          loading={busy}
          loadingText="Generating…"
        >
          <FiTrendingUp />{" "}
          {byo ? "Generate from my list" : "Generate countdown"}
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
