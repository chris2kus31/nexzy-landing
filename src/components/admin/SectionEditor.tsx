"use client";

import { useState } from "react";
import { Box, Text, Button, Flex, Input, Stack } from "@chakra-ui/react";
import { regenerateSection } from "@/lib/admin/client";

/** Parse the "## " section headings out of a markdown body. */
function headings(body: string): string[] {
  return (body || "")
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, "").trim())
    .filter(Boolean);
}

/**
 * Section-level co-authoring: rewrite / expand one "## " section at a time, or
 * draft a brand-new one. Cheaper than regenerating the whole guide. Operates on
 * the last SAVED body; reloads the editor when done.
 */
export default function SectionEditor({
  postId,
  body,
  onDone,
}: {
  postId: string;
  body: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newHeading, setNewHeading] = useState("");
  const [instr, setInstr] = useState("");
  const sections = headings(body);

  async function run(heading: string, action: "rewrite" | "expand" | "draft") {
    if (!heading) return;
    setBusy(`${action}:${heading}`);
    setMsg(null);
    try {
      const r = await regenerateSection(postId, {
        heading,
        action,
        instructions: instr.trim() || undefined,
      });
      if (!r.ok) {
        setMsg(r.message || "Could not update that section.");
      } else {
        setMsg(`Updated “${r.heading}”. Reloading…`);
        setNewHeading("");
        setInstr("");
        onDone();
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3}
    >
      <Text
        fontSize="xs"
        fontWeight="600"
        color="nexzy.gray.100"
        textTransform="uppercase"
        letterSpacing="wide"
        mb={1}
      >
        Section co-authoring
      </Text>
      <Text fontSize="11px" color="nexzy.gray.100" mb={3}>
        Rewrite or expand one section at a time — cheaper than regenerating the
        whole guide. Runs on the last <b>saved</b> version.
      </Text>

      <Input
        value={instr}
        onChange={(e) => setInstr(e.target.value)}
        placeholder="Optional direction for the next action (e.g. 'add a no-summons example')"
        size="sm"
        mb={3}
        color="nexzy.white"
        bg="whiteAlpha.50"
        borderColor="whiteAlpha.300"
        _placeholder={{ color: "nexzy.gray.100" }}
      />

      <Stack gap={2}>
        {sections.length === 0 && (
          <Text fontSize="xs" color="nexzy.gray.100">
            No “## ” sections found in the saved body.
          </Text>
        )}
        {sections.map((h) => (
          <Flex key={h} align="center" justify="space-between" gap={2}>
            <Text fontSize="xs" color="nexzy.white" flex="1">
              {h}
            </Text>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              loading={busy === `rewrite:${h}`}
              onClick={() => run(h, "rewrite")}
            >
              Rewrite
            </Button>
            <Button
              size="xs"
              variant="outline"
              color="nexzy.white"
              borderColor="whiteAlpha.300"
              loading={busy === `expand:${h}`}
              onClick={() => run(h, "expand")}
            >
              Expand
            </Button>
          </Flex>
        ))}
      </Stack>

      <Flex mt={3} gap={2}>
        <Input
          value={newHeading}
          onChange={(e) => setNewHeading(e.target.value)}
          placeholder="New section heading to draft"
          size="sm"
          color="nexzy.white"
          bg="whiteAlpha.50"
          borderColor="whiteAlpha.300"
          _placeholder={{ color: "nexzy.gray.100" }}
        />
        <Button
          size="sm"
          colorPalette="blue"
          loading={busy === `draft:${newHeading.trim()}`}
          disabled={newHeading.trim().length < 2}
          onClick={() => run(newHeading.trim(), "draft")}
        >
          Draft
        </Button>
      </Flex>

      {msg && (
        <Text fontSize="11px" color="nexzy.lightBlue" mt={2}>
          {msg}
        </Text>
      )}
    </Box>
  );
}
