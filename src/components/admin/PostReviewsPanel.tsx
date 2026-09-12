"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { FiFlag, FiTrash2, FiCheck } from "react-icons/fi";
import {
  getPostReviews,
  removePostReview,
  dismissPostReview,
  type PostReview,
} from "@/lib/admin/client";

/**
 * Posts to review — the SOFT topicality queue (1H-a). The classifier flags feed
 * posts that read as off-topic (not gaming) and drops them here; the post stays
 * visible to followers but is hidden from discovery. The admin either REMOVES it
 * (soft-delete + the author is warned) or DISMISSES the flag (false positive →
 * the post rejoins discovery). This is separate from harm-moderation, which
 * hard-hides on its own.
 */
export default function PostReviewsPanel() {
  const [rows, setRows] = useState<PostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getPostReviews()
      .then(setRows)
      .catch((e) => setError(e?.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRemove = async (r: PostReview) => {
    setBusyId(r.id);
    setError("");
    try {
      await removePostReview(r.id);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      setError((e as Error)?.message || "Remove failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doDismiss = async (r: PostReview) => {
    setBusyId(r.id);
    setError("");
    try {
      await dismissPostReview(r.id);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      setError((e as Error)?.message || "Dismiss failed.");
    } finally {
      setBusyId(null);
    }
  };

  const pct = (score: number | null) =>
    score == null ? null : `${Math.round(score * 100)}%`;

  return (
    <Box>
      <HStack gap={2} mb={1}>
        <Box color="nexzy.lightBlue">
          <FiFlag />
        </Box>
        <Heading size="md" color="nexzy.white">
          Posts to review
        </Heading>
        {rows.length > 0 && (
          <Text fontSize="sm" color="nexzy.gray.100">
            ({rows.length})
          </Text>
        )}
      </HStack>
      <Text fontSize="sm" color="nexzy.gray.100" mb={5}>
        Feed posts our topicality check judged likely off-topic (not gaming).
        They&apos;re still visible to the author&apos;s followers but hidden
        from discovery. Remove takes the post down and warns the author; Dismiss
        clears the flag (false positive) so it rejoins discovery.
      </Text>

      {error && (
        <Text color="red.300" fontSize="sm" mb={4}>
          {error}
        </Text>
      )}

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner color="nexzy.lightBlue" />
        </Flex>
      ) : rows.length === 0 ? (
        <Box
          border="1px dashed"
          borderColor="whiteAlpha.300"
          borderRadius="xl"
          p={10}
          textAlign="center"
        >
          <Text color="nexzy.gray.100">
            Nothing to review. Off-topic posts appear here when the topicality
            check flags one.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {rows.map((r) => {
            const busy = busyId === r.id;
            const confidence = pct(r.score);
            return (
              <Box
                key={r.id}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={4}
              >
                <HStack gap={2} mb={2} wrap="wrap">
                  <Badge colorPalette="orange" variant="subtle">
                    Off-topic
                  </Badge>
                  {confidence && (
                    <Badge colorPalette="gray" variant="subtle">
                      {confidence} confidence
                    </Badge>
                  )}
                  {r.post?.flaggedForModeration && (
                    <Badge colorPalette="red" variant="subtle">
                      Also harm-flagged
                    </Badge>
                  )}
                  <Text fontSize="xs" color="nexzy.gray.100">
                    by {r.author?.username ?? "unknown"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </Text>
                </HStack>

                <Box
                  bg="whiteAlpha.100"
                  borderRadius="md"
                  p={3}
                  mb={3}
                  maxH="200px"
                  overflowY="auto"
                >
                  <Text color="nexzy.white" fontSize="sm" whiteSpace="pre-wrap">
                    {r.post?.content?.trim() || "(no text)"}
                  </Text>
                </Box>

                <Flex justify="flex-end">
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      color="nexzy.gray.100"
                      borderColor="whiteAlpha.300"
                      _hover={{ bg: "whiteAlpha.100" }}
                      disabled={busy}
                      onClick={() => doDismiss(r)}
                    >
                      <FiCheck /> Dismiss (keep)
                    </Button>
                    <Button
                      size="sm"
                      bg="red.500"
                      color="white"
                      _hover={{ bg: "red.600" }}
                      loading={busy}
                      onClick={() => doRemove(r)}
                    >
                      <FiTrash2 /> Remove &amp; warn
                    </Button>
                  </HStack>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}
