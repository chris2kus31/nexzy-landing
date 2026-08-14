"use client";

import { useEffect, useState } from "react";
import { Box, Text, Input, HStack, Button } from "@chakra-ui/react";
import { labelProps, inputProps } from "./shared";
import type { ArticleFormatData, HardwareSpec } from "@/lib/admin/client";

/**
 * Hardware core-module editor: the spec face-off rows + compare labels + the
 * "who it's for" chips. At least one row is required to publish (format gate).
 */
export default function HardwareEditor({
  value,
  onChange,
}: {
  value: ArticleFormatData;
  onChange: (fd: ArticleFormatData) => void;
}) {
  const spec: HardwareSpec = value.hardwareSpec ?? { rows: [] };
  const rows = spec.rows ?? [];
  const setSpec = (p: Partial<HardwareSpec>) =>
    onChange({ ...value, hardwareSpec: { ...spec, ...p } });
  const setLabel = (which: "a" | "b", v: string) =>
    setSpec({
      compareLabels: {
        a: which === "a" ? v : (spec.compareLabels?.a ?? ""),
        b: which === "b" ? v : (spec.compareLabels?.b ?? ""),
      },
    });
  const setRow = (i: number, p: Partial<HardwareSpec["rows"][number]>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...p };
    setSpec({ rows: next });
  };
  const addRow = () => setSpec({ rows: [...rows, { k: "", a: "", b: "" }] });
  const removeRow = (i: number) =>
    setSpec({ rows: rows.filter((_, j) => j !== i) });

  // "Who it's for" is comma-separated free text. Edit it as a raw string and
  // only parse to an array on blur — parsing on every keystroke would strip the
  // space/comma the moment you type it. Resync when the post reloads externally.
  const [whoForText, setWhoForText] = useState((value.whoFor ?? []).join(", "));
  const whoForKey = (value.whoFor ?? []).join("");
  useEffect(() => {
    setWhoForText((value.whoFor ?? []).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whoForKey]);
  const commitWhoFor = () =>
    onChange({
      ...value,
      whoFor: whoForText
        .split(",")
        .map((s) => s.trim())
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
        Hardware — spec face-off
      </Text>
      <HStack gap={2} mb={3}>
        <Box flex="1">
          <Text {...labelProps}>Column A label</Text>
          <Input
            value={spec.compareLabels?.a ?? ""}
            onChange={(e) => setLabel("a", e.target.value)}
            placeholder="Steam Machine"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>Column B label (blank = single column)</Text>
          <Input
            value={spec.compareLabels?.b ?? ""}
            onChange={(e) => setLabel("b", e.target.value)}
            placeholder="Series X"
            {...inputProps}
          />
        </Box>
      </HStack>

      <Text {...labelProps}>Rows</Text>
      {rows.map((r, i) => (
        <HStack key={i} gap={2} mb={2} align="start">
          <Input
            value={r.k}
            onChange={(e) => setRow(i, { k: e.target.value })}
            placeholder="Spec (GPU)"
            flex="1"
            {...inputProps}
          />
          <Input
            value={r.a}
            onChange={(e) => setRow(i, { a: e.target.value })}
            placeholder="A value"
            flex="1"
            {...inputProps}
          />
          <Input
            value={r.b ?? ""}
            onChange={(e) => setRow(i, { b: e.target.value })}
            placeholder="B value"
            flex="1"
            {...inputProps}
          />
          <Button
            size="sm"
            variant="ghost"
            color="red.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => removeRow(i)}
            aria-label="Remove row"
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
        onClick={addRow}
        mb={3}
      >
        + Add row
      </Button>

      <Box>
        <Text {...labelProps}>Who it&apos;s for (comma separated)</Text>
        <Input
          value={whoForText}
          onChange={(e) => setWhoForText(e.target.value)}
          onBlur={commitWhoFor}
          placeholder="Tinkerers, Big Steam libraries, 4K living-room"
          {...inputProps}
        />
      </Box>
    </Box>
  );
}
