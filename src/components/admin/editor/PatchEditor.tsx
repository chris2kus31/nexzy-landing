"use client";

import { useEffect, useState } from "react";
import { Box, Text, Input, Textarea, HStack, Button } from "@chakra-ui/react";
import { labelProps, inputProps } from "./shared";
import type {
  ArticleFormatData,
  PatchData,
  PatchChange,
} from "@/lib/admin/client";

const KINDS: PatchChange["kind"][] = [
  "buff",
  "nerf",
  "rework",
  "new",
  "change",
];

/**
 * Patch Notes core-module editor: the TL;DR, the structured buffs/nerfs, and the
 * meta note. At least one change is required to publish (format gate).
 */
export default function PatchEditor({
  value,
  onChange,
}: {
  value: ArticleFormatData;
  onChange: (fd: ArticleFormatData) => void;
}) {
  const patch: PatchData = value.patch ?? {};
  const changes: PatchChange[] = patch.changes ?? [];
  const set = (p: Partial<PatchData>) =>
    onChange({ ...value, patch: { ...patch, ...p } });

  const setChange = (i: number, p: Partial<PatchChange>) => {
    const next = changes.slice();
    next[i] = { ...next[i], ...p };
    set({ changes: next });
  };
  const addChange = () =>
    set({ changes: [...changes, { kind: "buff", name: "" }] });
  const removeChange = (i: number) =>
    set({ changes: changes.filter((_, j) => j !== i) });

  // TL;DR is one bullet per line. Edit it as raw text and only split/trim on
  // blur — trimming per keystroke strips the space you need between words.
  const [tldrText, setTldrText] = useState((patch.tldr ?? []).join("\n"));
  const tldrKey = (patch.tldr ?? []).join("");
  useEffect(() => {
    setTldrText((patch.tldr ?? []).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tldrKey]);
  const commitTldr = () =>
    set({
      tldr: tldrText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    });

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={4}
    >
      <Text {...labelProps} mb={3}>
        Patch — the breakdown
      </Text>

      <Box mb={3}>
        <Text {...labelProps}>TL;DR (one per line, the 2-3 that matter)</Text>
        <Textarea
          value={tldrText}
          onChange={(e) => setTldrText(e.target.value)}
          onBlur={commitTldr}
          rows={3}
          {...inputProps}
        />
      </Box>

      <Text {...labelProps}>Changes</Text>
      {changes.map((c, i) => (
        <HStack key={i} gap={2} mb={2} align="start">
          <select
            value={c.kind}
            onChange={(e) =>
              setChange(i, { kind: e.target.value as PatchChange["kind"] })
            }
            style={{
              background: "#20264a",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              padding: "8px",
              fontSize: 13,
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <Input
            value={c.name}
            onChange={(e) => setChange(i, { name: e.target.value })}
            placeholder="What changed (e.g. Hela)"
            flex="1"
            {...inputProps}
          />
          <Input
            value={c.detail ?? ""}
            onChange={(e) => setChange(i, { detail: e.target.value })}
            placeholder="short detail"
            flex="1.5"
            {...inputProps}
          />
          <Button
            size="sm"
            variant="ghost"
            color="red.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => removeChange(i)}
            aria-label="Remove change"
          >
            ✕
          </Button>
        </HStack>
      ))}
      <Button
        size="xs"
        variant="ghost"
        color="nexzy.lightBlue"
        _hover={{ bg: "whiteAlpha.100" }}
        onClick={addChange}
        mb={3}
      >
        + Add change
      </Button>

      <Box mb={3}>
        <Text {...labelProps}>What it means for the meta</Text>
        <Textarea
          value={patch.metaNote ?? ""}
          onChange={(e) => set({ metaNote: e.target.value })}
          rows={2}
          {...inputProps}
        />
      </Box>
      <Box>
        <Text {...labelProps}>Full changelog URL</Text>
        <Input
          value={patch.fullChangelogUrl ?? ""}
          onChange={(e) => set({ fullChangelogUrl: e.target.value })}
          placeholder="https://..."
          {...inputProps}
        />
      </Box>
    </Box>
  );
}
