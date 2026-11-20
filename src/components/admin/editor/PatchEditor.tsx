"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Text,
  Input,
  Textarea,
  HStack,
  Button,
  Grid,
} from "@chakra-ui/react";
import { FiX, FiPlus, FiList, FiType } from "react-icons/fi";
import { labelProps, inputProps } from "./shared";
import type {
  ArticleFormatData,
  PatchData,
  PatchChange,
} from "@/lib/admin/client";
import {
  PATCH_KINDS,
  parsePatchText,
  patchItemsToText,
  type PatchItem,
} from "@/lib/blog/patch";

const selectStyle = {
  background: "#20264a",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 6,
  padding: "8px",
  fontSize: 13,
} as const;

/**
 * Patch Notes editor -> formatData.patch, rendered as the patch board
 * (components/blog/PatchBoard.tsx): header (title, version, date, platforms,
 * size, impact), who it hits, TL;DR, changes, meta note. Changes can be edited
 * as rows or pasted as lines ("- [BUFF] Pistol damage: 40 -> 44 | detail",
 * "### Weapons" for groups). At least one change is required to publish.
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
    set({
      changes: [
        ...changes,
        { kind: "buff", name: "", group: changes.at(-1)?.group ?? null },
      ],
    });
  const removeChange = (i: number) =>
    set({ changes: changes.filter((_, j) => j !== i) });

  // Multi-line fields are edited as raw text and only split on blur, so
  // spaces/commas typed mid-word are not eaten.
  const [tldrText, setTldrText] = useState((patch.tldr ?? []).join("\n"));
  const [whoText, setWhoText] = useState((patch.who ?? []).join(", "));
  const [mode, setMode] = useState<"rows" | "lines">("rows");
  const [linesText, setLinesText] = useState("");
  const tldrKey = (patch.tldr ?? []).join("");
  const whoKey = (patch.who ?? []).join("");
  useEffect(() => {
    setTldrText((patch.tldr ?? []).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tldrKey]);
  useEffect(() => {
    setWhoText((patch.who ?? []).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whoKey]);

  const openLines = () => {
    setLinesText(patchItemsToText(changes as PatchItem[]));
    setMode("lines");
  };
  const commitLines = () => {
    const items = parsePatchText(linesText);
    if (items.length || !linesText.trim()) set({ changes: items });
  };

  const field = (
    label: string,
    key: "title" | "version" | "date" | "platforms" | "size",
    placeholder: string,
  ) => (
    <Box>
      <Text {...labelProps}>{label}</Text>
      <Input
        value={patch[key] ?? ""}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        {...inputProps}
      />
    </Box>
  );

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={4}
    >
      <Text {...labelProps} mb={3}>
        Patch notes board
      </Text>

      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={2} mb={2}>
        {field("Title", "title", "e.g. Update 1.04 or Season 3 patch")}
        {field("Version", "version", "e.g. 1.04")}
        {field("Date", "date", "e.g. Nov 20, 2026")}
      </Grid>
      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={2} mb={2}>
        {field("Platforms", "platforms", "e.g. PS5, PC")}
        {field("Download size", "size", "e.g. 9 GB")}
        <Box>
          <Text {...labelProps}>Impact</Text>
          <select
            value={patch.impact ?? ""}
            onChange={(e) =>
              set({
                impact: (e.target.value || null) as PatchData["impact"],
              })
            }
            style={{ ...selectStyle, width: "100%" }}
          >
            <option value="">None</option>
            <option value="minor">Minor</option>
            <option value="medium">Medium</option>
            <option value="major">Major</option>
          </select>
        </Box>
      </Grid>
      <Box mb={3}>
        <Text {...labelProps}>Who it hits (comma separated)</Text>
        <Input
          value={whoText}
          onChange={(e) => setWhoText(e.target.value)}
          onBlur={() =>
            set({
              who: whoText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. Ranked players, Solo players"
          {...inputProps}
        />
      </Box>

      <Box mb={3}>
        <Text {...labelProps}>
          What matters (one per line, the 2-3 that matter)
        </Text>
        <Textarea
          value={tldrText}
          onChange={(e) => setTldrText(e.target.value)}
          onBlur={() =>
            set({
              tldr: tldrText
                .split("\n")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          {...inputProps}
        />
      </Box>

      <HStack justify="space-between" mb={2}>
        <Text {...labelProps} mb={0}>
          Changes ({changes.length})
        </Text>
        <HStack gap={1}>
          <Button
            size="xs"
            variant={mode === "rows" ? "solid" : "ghost"}
            bg={mode === "rows" ? "whiteAlpha.200" : undefined}
            color="gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => {
              if (mode === "lines") commitLines();
              setMode("rows");
            }}
          >
            <FiList /> Rows
          </Button>
          <Button
            size="xs"
            variant={mode === "lines" ? "solid" : "ghost"}
            bg={mode === "lines" ? "whiteAlpha.200" : undefined}
            color="gray.100"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={openLines}
          >
            <FiType /> Paste lines
          </Button>
        </HStack>
      </HStack>

      {mode === "lines" ? (
        <Box mb={3}>
          <Textarea
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
            onBlur={commitLines}
            rows={10}
            fontFamily="mono"
            fontSize="sm"
            placeholder={
              "Example:\n### Weapons\n- [BUFF] Starter pistol damage: 40 -> 44 | Early missions get easier\n- [NERF] Sniper reload time: 2.1s -> 2.6s\n### World\n- [NERF] Police heli spawns: Fewer | 3 stars and up\n- [NEW] Photo mode: 12 new filters\n- [FIX] Saves not loading after chapter 2\n- [KNOWN] Texture pop-in at night"
            }
            {...inputProps}
          />
          <Text fontSize="xs" color="gray.400" mt={1}>
            Tags: BUFF, NERF, NEW, CHANGE, REWORK, REMOVED, FIX, KNOWN.
            &quot;Name: old -&gt; new&quot; shows the change and the %; &quot;|
            text&quot; adds a detail; &quot;### Group&quot; groups buffs and
            nerfs. Lines without a tag are ignored.
          </Text>
        </Box>
      ) : (
        <>
          {changes.map((c, i) => (
            <Box
              key={i}
              mb={2}
              p={2}
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              borderRadius="md"
            >
              <Grid
                templateColumns={{ base: "1fr", md: "110px 1fr 2fr auto" }}
                gap={2}
                mb={2}
              >
                <select
                  value={c.kind}
                  onChange={(e) =>
                    setChange(i, {
                      kind: e.target.value as PatchChange["kind"],
                    })
                  }
                  style={selectStyle}
                >
                  {PATCH_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <Input
                  value={c.group ?? ""}
                  onChange={(e) =>
                    setChange(i, { group: e.target.value || null })
                  }
                  placeholder="Group (optional)"
                  {...inputProps}
                />
                <Input
                  value={c.name}
                  onChange={(e) => setChange(i, { name: e.target.value })}
                  placeholder="What changed"
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
                  <FiX />
                </Button>
              </Grid>
              <Grid templateColumns="1fr 1fr" gap={2}>
                <Input
                  value={c.from ?? ""}
                  onChange={(e) =>
                    setChange(i, { from: e.target.value || null })
                  }
                  placeholder="Old value (optional)"
                  {...inputProps}
                />
                <Input
                  value={c.to ?? ""}
                  onChange={(e) => setChange(i, { to: e.target.value || null })}
                  placeholder="New value (optional)"
                  {...inputProps}
                />
                <Textarea
                  value={c.detail ?? ""}
                  onChange={(e) => setChange(i, { detail: e.target.value })}
                  placeholder="Short detail (optional)"
                  gridColumn="span 2"
                  rows={2}
                  {...inputProps}
                />
              </Grid>
            </Box>
          ))}
          <Button
            size="xs"
            variant="ghost"
            color="nexzy.lightBlue"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={addChange}
            mb={3}
          >
            <FiPlus /> Add change
          </Button>
        </>
      )}

      <Box mb={3}>
        <Text {...labelProps}>What it means (for the meta or for players)</Text>
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
