"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Box, Flex, Text, Button, VStack } from "@chakra-ui/react";
import { uploadBodyImage } from "@/lib/admin/client";
import { labelProps } from "./shared";

function parseShotMarkers(
  body: string,
): { line: number; raw: string; desc: string }[] {
  const out: { line: number; raw: string; desc: string }[] = [];
  body.split(/\r?\n/).forEach((line, i) => {
    const m = /^>\s*(?:📷\s*)?SHOT:\s*(.*)$/i.exec(line.trim());
    if (m) out.push({ line: i, raw: line, desc: m[1].trim() });
  });
  return out;
}

/**
 * Guide-only. Lists the recommended-screenshot slots the writer left in the
 * body (`> 📷 SHOT: what to show`) and lets you drop a real screenshot into
 * each: it uploads the image, replaces that marker line with an inline image,
 * and SAVES immediately (via onInsert) so it behaves like the hero upload —
 * no separate "Save edits" step needed for the shot to stick.
 */
export default function ScreenshotSlots({
  postId,
  body,
  onInsert,
}: {
  postId: string;
  body: string;
  onInsert: (next: string) => Promise<void>;
}) {
  const markers = parseShotMarkers(body);
  const [uploading, setUploading] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const activeRaw = useRef<string>("");
  const activeDesc = useRef<string>("");

  const pick = (raw: string, desc: string) => {
    activeRaw.current = raw;
    activeDesc.current = desc;
    setErr("");
    fileRef.current?.click();
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image is too large (max 10 MB).");
      return;
    }
    const raw = activeRaw.current;
    const desc = activeDesc.current;
    setUploading(markers.findIndex((m) => m.raw === raw));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { url } = await uploadBodyImage(
          postId,
          String(reader.result || ""),
        );
        const lines = body.split(/\r?\n/);
        const li = lines.findIndex((l) => l.trim() === raw.trim());
        if (li >= 0) {
          const alt = desc.replace(/[[\]]/g, "").trim();
          lines[li] = `![${alt}](${url})`;
          await onInsert(lines.join("\n"));
        } else {
          setErr("That slot changed — reopen the list and try again.");
        }
      } catch (e2) {
        setErr((e2 as Error)?.message || "Upload failed.");
      } finally {
        setUploading(null);
      }
    };
    reader.onerror = () => {
      setErr("Could not read that file.");
      setUploading(null);
    };
    reader.readAsDataURL(file);
  };

  if (markers.length === 0) return null;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={3}
    >
      <Text {...labelProps}>
        Recommended screenshots ({markers.length} to fill)
      </Text>
      <Text fontSize="11px" color="nexzy.gray.100" mb={3}>
        The writer marked where a screenshot helps. Upload one and it drops into
        the body where the marker is — saved automatically.
      </Text>
      <VStack align="stretch" gap={2}>
        {markers.map((m, i) => (
          <Flex
            key={`${m.line}-${i}`}
            align="center"
            justify="space-between"
            gap={3}
            bg="whiteAlpha.50"
            borderRadius="md"
            px={3}
            py={2}
          >
            <Text fontSize="sm" color="nexzy.white" lineClamp={2}>
              📷 {m.desc || "(no description)"}
            </Text>
            <Button
              size="xs"
              colorPalette="blue"
              flexShrink={0}
              loading={uploading === i}
              loadingText="Uploading…"
              onClick={() => pick(m.raw, m.desc)}
            >
              ↑ Upload
            </Button>
          </Flex>
        ))}
      </VStack>
      {err && (
        <Text mt={2} fontSize="xs" color="red.300">
          {err}
        </Text>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />
    </Box>
  );
}
