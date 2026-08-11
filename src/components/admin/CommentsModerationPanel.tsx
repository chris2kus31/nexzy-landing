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
  Link,
  Badge,
} from "@chakra-ui/react";
import {
  FiFlag,
  FiEyeOff,
  FiCheck,
  FiTrash2,
  FiExternalLink,
} from "react-icons/fi";
import {
  getReportedComments,
  reinstateComment,
  removeComment,
  type ReportedComment,
} from "@/lib/admin/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

/**
 * Comment moderation queue: reader comments that were reported or auto-hidden.
 * "Keep" reinstates a wrongly-flagged comment (clears the flag + reports);
 * "Remove" soft-deletes a genuinely bad one. Reader-facing threads only ever
 * show visible comments, so this is the sole place hidden ones surface.
 */
export default function CommentsModerationPanel() {
  const [items, setItems] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getReportedComments()
      .then(setItems)
      .catch((e) => setError(e?.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const doKeep = async (c: ReportedComment) => {
    setBusyId(c.id);
    setError("");
    try {
      await reinstateComment(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      setError((e as Error)?.message || "Keep failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doRemove = async (c: ReportedComment) => {
    setBusyId(c.id);
    setError("");
    try {
      await removeComment(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      setError((e as Error)?.message || "Remove failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <HStack gap={2} mb={1}>
        <Box color="orange.300">
          <FiFlag />
        </Box>
        <Heading size="md" color="nexzy.white">
          Reported comments
        </Heading>
        {items.length > 0 && (
          <Text fontSize="sm" color="nexzy.gray.100">
            ({items.length})
          </Text>
        )}
      </HStack>
      <Text fontSize="sm" color="nexzy.gray.100" mb={5}>
        Reader comments that were reported or auto-hidden. Keep reinstates a
        comment that was flagged unfairly; Remove soft-deletes a bad one. Hidden
        comments never show on the site until you Keep them.
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
      ) : items.length === 0 ? (
        <Box
          border="1px dashed"
          borderColor="whiteAlpha.300"
          borderRadius="xl"
          p={10}
          textAlign="center"
        >
          <Text color="nexzy.gray.100">
            Nothing to review. Reported or hidden comments show up here.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {items.map((c) => {
            const busy = busyId === c.id;
            const url = c.postSlug ? `${SITE_URL}/rewind/${c.postSlug}` : null;
            return (
              <Box
                key={c.id}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor={c.hidden ? "orange.400/50" : "whiteAlpha.200"}
                borderRadius="lg"
                p={4}
              >
                <HStack gap={2} mb={2} wrap="wrap">
                  <Text fontSize="sm" fontWeight="700" color="nexzy.white">
                    @{c.author.username}
                  </Text>
                  <Badge
                    bg="orange.400/20"
                    color="orange.200"
                    borderRadius="full"
                    px={2}
                    fontSize="10px"
                  >
                    <HStack gap={1}>
                      <FiFlag /> {c.reportCount} report
                      {c.reportCount === 1 ? "" : "s"}
                    </HStack>
                  </Badge>
                  {c.hidden && (
                    <Badge
                      bg="red.400/20"
                      color="red.200"
                      borderRadius="full"
                      px={2}
                      fontSize="10px"
                    >
                      <HStack gap={1}>
                        <FiEyeOff /> Hidden
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                <Text
                  color="nexzy.gray.100"
                  fontSize="sm"
                  mb={3}
                  whiteSpace="pre-wrap"
                >
                  {c.content}
                </Text>

                <Flex
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={3}
                >
                  {url ? (
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="nexzy.lightBlue"
                      fontSize="xs"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <FiExternalLink /> {c.postTitle || "View thread"}
                    </Link>
                  ) : (
                    <Box />
                  )}
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      color="red.300"
                      borderColor="red.400/50"
                      _hover={{ bg: "red.500/15" }}
                      disabled={busy}
                      onClick={() => doRemove(c)}
                    >
                      <FiTrash2 /> Remove
                    </Button>
                    <Button
                      size="sm"
                      bg="green.500"
                      color="white"
                      _hover={{ bg: "green.600" }}
                      loading={busy}
                      onClick={() => doKeep(c)}
                    >
                      <FiCheck /> Keep
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
