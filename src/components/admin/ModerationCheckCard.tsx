"use client";

import { useState } from "react";
import { Badge, Box, Button, Flex, Text, VStack } from "@chakra-ui/react";
import { FiShield } from "react-icons/fi";
import {
  runModerationCheck,
  type ModerationCheckResult,
} from "@/lib/admin/client";

const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};

/**
 * Pulse → Moderation check (owner). Post moderation fails open by design, so
 * this is how we know it's actually running: fixed samples through the same
 * verdict posts use + what it hid in the last 7 days. Runs on click only.
 */
export default function ModerationCheckCard() {
  const [res, setRes] = useState<ModerationCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      setRes(await runModerationCheck());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderColor={
        res ? (res.working ? "green.400" : "red.400") : "whiteAlpha.200"
      }
      borderRadius="10px"
      p={4}
    >
      <Flex align="center" gap={3} wrap="wrap">
        <FiShield color="currentColor" />
        <Text color="nexzy.white" fontWeight="600" fontSize="sm">
          Moderation check
        </Text>
        {res && (
          <Badge colorPalette={res.working ? "green" : "red"} size="sm">
            {res.working ? "Working" : "Not working"}
          </Badge>
        )}
        <Box flex="1" />
        <Button
          size="xs"
          {...outlineBtn}
          onClick={() => void run()}
          loading={busy}
        >
          Run check
        </Button>
      </Flex>
      {!res && !err && (
        <Text fontSize="xs" color="whiteAlpha.500" mt={2}>
          Sends 3 test sentences through the same moderation posts use. Free;
          runs only when you click.
        </Text>
      )}
      {err && (
        <Text color="red.300" fontSize="xs" mt={2}>
          {err}
        </Text>
      )}
      {res && (
        <VStack align="stretch" gap={1} mt={3} fontSize="xs">
          {!res.keyConfigured && (
            <Text color="red.300">
              OPENAI_API_KEY is not set on the API, so every post goes through
              unchecked.
            </Text>
          )}
          {res.samples.map((s) => (
            <Flex key={s.key} gap={2} color="nexzy.gray.100" wrap="wrap">
              <Text color="nexzy.white" minW="130px">
                {s.label}
              </Text>
              <Text minW="120px">
                expected {s.expect === "block" ? "blocked" : "allowed"}
              </Text>
              {s.error ? (
                <Text color="red.300">failed: {s.error}</Text>
              ) : (
                <>
                  <Text color={s.ok ? "green.300" : "orange.300"}>
                    {s.blocked ? "blocked" : "allowed"}
                  </Text>
                  {s.topCategory && (
                    <Text color="whiteAlpha.500">
                      top: {s.topCategory} {s.topScore}
                    </Text>
                  )}
                </>
              )}
            </Flex>
          ))}
          <Text color="whiteAlpha.600" mt={1}>
            Last 7 days: {res.last7d.feedPostsHidden} of {res.last7d.feedPosts}{" "}
            posts hidden, {res.last7d.commentsHidden} comments and{" "}
            {res.last7d.articleCommentsHidden} article comments hidden. Took{" "}
            {res.latencyMs} ms.
          </Text>
        </VStack>
      )}
    </Box>
  );
}
