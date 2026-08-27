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
import { FiZap } from "react-icons/fi";
import { runExplainer } from "@/lib/admin/client";

// Active writers for coverage. Chuy = default. (Bana omitted here — the
// all-ages persona isn't a fit for mature current-game coverage.) Ideally this
// list comes from the writer_personas table; hardcoded for now.
const WRITERS = ["Chuy", "Eli", "Leslie"];

/**
 * Commission an "Everything We Know" big-game explainer. Type the subject, paste
 * your operator notes (the ONLY facts the writer may use) and reference URLs,
 * pick a writer, and Generate. The writer builds a ~5-minute timeline breakdown
 * that keeps CONFIRMED and LEAKED separate and can't invent facts beyond your
 * notes. Lands as a long-form video lead in Content Studio → Video Leads.
 */
export default function EverythingWeKnowPanel({
  onRan,
}: {
  onRan?: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [urls, setUrls] = useState("");
  const [writer, setWriter] = useState(WRITERS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!subject.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const lead = await runExplainer({
        subject: subject.trim(),
        notes: notes.trim() || undefined,
        urls: urls.trim() || undefined,
        writer,
      });
      setMsg({
        ok: !!lead,
        text: lead
          ? "Everything We Know lead created — find it in Content Studio → Video Leads. Produce it to write the ~5-min timeline script (confirmed vs leaked, grounded only in your notes). Add more facts in the steer box at Produce."
          : "Couldn't create the lead — check the subject isn't empty.",
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not create the explainer.",
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
        Everything We Know
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        A ~5-minute timeline breakdown of one big game/topic. Paste your notes
        (the{" "}
        <Box as="span" color="nexzy.white">
          only
        </Box>{" "}
        facts the writer may use) + reference links; it keeps{" "}
        <Box as="span" color="nexzy.white">
          confirmed vs leaked
        </Box>{" "}
        separate and can&rsquo;t invent facts. Lands in{" "}
        <Box as="span" color="nexzy.white">
          Content Studio → Video Leads
        </Box>
        .
      </Text>

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Subject — e.g. &ldquo;GTA 6&rdquo;, &ldquo;The Elder Scrolls VI&rdquo;
      </Text>
      <Input
        size="sm"
        mb={3}
        value={subject}
        onChange={(e) => setSubject(e.currentTarget.value)}
        placeholder="The game or topic"
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Operator notes (the ONLY facts the writer may use — confirmed facts +
        leaks clearly labeled, with dates/numbers)
      </Text>
      <Textarea
        size="sm"
        mb={3}
        rows={7}
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        placeholder="Paste the facts. Mark leaks as leaked. Anything not here won't be stated. You can add more in the steer box at Produce."
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Reference URLs (one per line — attribution only, not fetched)
      </Text>
      <Textarea
        size="sm"
        mb={3}
        rows={3}
        value={urls}
        onChange={(e) => setUrls(e.currentTarget.value)}
        placeholder="https://…"
        color="nexzy.white"
        bg="whiteAlpha.100"
        borderColor="whiteAlpha.300"
      />

      <Text color="nexzy.gray.100" fontSize="xs" mb={1}>
        Writer
      </Text>
      <NativeSelect.Root size="sm" mb={4} maxW="200px">
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

      <Flex justify="flex-end">
        <Button
          size="sm"
          colorPalette="purple"
          onClick={submit}
          loading={busy}
          loadingText="Generating…"
          disabled={!subject.trim()}
        >
          <FiZap /> Generate Everything We Know
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
