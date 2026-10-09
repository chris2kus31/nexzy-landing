"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  Badge,
  Button,
  Link,
} from "@chakra-ui/react";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { MetricsEditor } from "@/components/admin/PostLogBox";
import {
  fmtCt,
  getNeedsNumbers,
  type NeedsNumbersRow,
  type PostLogEntry,
} from "@/lib/admin/client-postlog";

/**
 * NEEDS NUMBERS — TikTok and Reddit posts from the Posts log whose 24-hour or
 * 7-day numbers are due (no API pulls them here). Type them in from TikTok
 * Studio / Reddit; they feed Post Lab's TikTok and Reddit entries.
 */
export default function NeedsNumbersPanel() {
  const [rows, setRows] = useState<NeedsNumbersRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      setRows(await getNeedsNumbers());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load the list.");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  // A row leaves the list once the snapshot that was due is saved.
  const onSaved = (row: NeedsNumbersRow, e: PostLogEntry) => {
    const done = !!e.metrics?.[row.due];
    setRows((prev) =>
      (prev ?? [])
        .map((r) => (r.id === e.id ? { ...r, ...e } : r))
        .filter((r) => !(r.id === e.id && done)),
    );
    if (done) setOpen(null);
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex align="center" gap={2} mb={1}>
        <Heading size="sm" color="nexzy.white">
          Needs numbers
        </Heading>
        {rows && rows.length > 0 && (
          <Badge colorPalette="yellow" variant="solid">
            {rows.length}
          </Badge>
        )}
        <Box flex={1} />
        <Button
          size="xs"
          variant="ghost"
          color="nexzy.gray.100"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => void load()}
          aria-label="Reload"
          title="Reload"
        >
          <FiRefreshCw aria-hidden />
        </Button>
      </Flex>
      <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
        TikTok and Reddit posts from the Posts log with numbers due. Read them
        in TikTok Studio or on Reddit at 24 hours and again at 7 days.
      </Text>

      {err && (
        <Flex gap={2} align="center">
          <Text color="red.300" fontSize="sm">
            {err}
          </Text>
          <Button size="xs" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </Flex>
      )}
      {!rows && !err && (
        <VStack align="stretch" gap={2}>
          {[0, 1].map((i) => (
            <Box key={i} h="44px" borderRadius="md" bg="whiteAlpha.100" />
          ))}
        </VStack>
      )}
      {rows && rows.length === 0 && (
        <Text color="nexzy.gray.100" fontSize="sm">
          All caught up. Nothing is due.
        </Text>
      )}
      {rows && rows.length > 0 && (
        <VStack align="stretch" gap={2}>
          {rows.map((r) => (
            <Box
              key={r.id}
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Flex gap={2} align="center" wrap="wrap">
                <Badge colorPalette="blue" variant="solid">
                  {r.platform === "tiktok" ? "TikTok" : "Reddit"}
                </Badge>
                <Badge
                  colorPalette={r.due === "d7" ? "purple" : "yellow"}
                  variant="subtle"
                >
                  {r.due === "d7" ? "7-day numbers due" : "24-hour numbers due"}
                </Badge>
                <Text
                  color="nexzy.white"
                  fontSize="sm"
                  flex="1"
                  minW={0}
                  lineClamp={1}
                >
                  {r.cardTitle ?? "(card removed)"}
                </Text>
                <Text color="nexzy.gray.100" fontSize="xs">
                  {fmtCt(r.postedAt)} CT
                </Text>
                {r.url && (
                  <Link
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    color="nexzy.lightBlue"
                    fontSize="xs"
                  >
                    Open <FiExternalLink aria-hidden />
                  </Link>
                )}
                <Button
                  size="xs"
                  bg="nexzy.blue"
                  color="white"
                  onClick={() => setOpen((o) => (o === r.id ? null : r.id))}
                >
                  {open === r.id ? "Close" : "Enter numbers"}
                </Button>
              </Flex>
              {open === r.id && (
                <MetricsEditor entry={r} onSaved={(e) => onSaved(r, e)} />
              )}
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
