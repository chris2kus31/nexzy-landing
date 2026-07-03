"use client";

import { useState } from "react";
import { Box, Flex, HStack, Heading, Text, Button } from "@chakra-ui/react";
import { runPipeline } from "@/lib/admin/client";
import { BEATS } from "@/lib/blog/beats";

const SCOPES = [{ key: "all", label: "All beats" }, ...BEATS];

/**
 * On-demand pipeline trigger. Enqueues a research run for one beat (or all);
 * new drafts flow through write -> edit -> media and land in the review queue.
 * onRan lets the parent refresh the queue + stats afterward.
 */
export default function RunPipelinePanel({ onRan }: { onRan?: () => void }) {
  const [scope, setScope] = useState("all");
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const { enqueued } = await runPipeline(
        scope === "all" ? undefined : scope,
      );
      const n = enqueued.length;
      setMsg({
        ok: true,
        text: `Queued ${n} beat${n === 1 ? "" : "s"}. New drafts will appear in the review queue in a few minutes — hit Refresh to check.`,
      });
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not start the pipeline.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
    >
      <Heading size="md" color="nexzy.white" mb={1}>
        Run the pipeline
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Fetch fresh stories and generate new drafts on demand. Pick a beat, or
        run them all.
      </Text>

      <Flex gap={3} align="center" wrap="wrap">
        <HStack gap={2} wrap="wrap">
          {SCOPES.map((s) => {
            const active = scope === s.key;
            return (
              <Button
                key={s.key}
                size="sm"
                onClick={() => setScope(s.key)}
                bg={active ? "nexzy.blue" : "transparent"}
                color={active ? "white" : "nexzy.gray.100"}
                borderWidth="1px"
                borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
              >
                {s.label}
              </Button>
            );
          })}
        </HStack>

        <Button
          ml={{ base: 0, md: "auto" }}
          size="sm"
          colorPalette="blue"
          onClick={run}
          loading={running}
          loadingText="Starting…"
        >
          Run now
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
