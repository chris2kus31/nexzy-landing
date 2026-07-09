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
  Input,
  Textarea,
  Link,
} from "@chakra-ui/react";
import { FiMessageSquare, FiCheck, FiX, FiExternalLink } from "react-icons/fi";
import {
  getForumSeeds,
  approveForumSeed,
  skipForumSeed,
  type ForumSeed,
} from "@/lib/admin/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

function publicUrl(seed: ForumSeed): string | null {
  if (!seed.slug) return null;
  const base =
    seed.postType === "guide"
      ? "/guides"
      : seed.postType === "list"
        ? "/lists"
        : "/blog";
  return `${SITE_URL}${base}/${seed.slug}`;
}

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  w: "full",
};

const labelProps = {
  fontSize: "xs",
  fontWeight: "600",
  color: "nexzy.gray.100",
  mb: 1,
  textTransform: "uppercase" as const,
  letterSpacing: "wide",
};

/**
 * Forum seed approval queue: proposed discussion threads the newsroom created
 * on publish, waiting for the admin to Approve (post it live) or Skip (never
 * suggest that article again). Approve/skip only touch the suggestion + the
 * bot thread — the user-facing forum is untouched.
 */
export default function ForumSeedsPanel() {
  const [seeds, setSeeds] = useState<ForumSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getForumSeeds()
      .then(setSeeds)
      .catch((e) => setError(e?.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = (id: string, patch: Partial<ForumSeed>) =>
    setSeeds((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const doApprove = async (s: ForumSeed) => {
    setBusyId(s.id);
    setError("");
    try {
      await approveForumSeed(s.id, { title: s.title, content: s.content });
      setSeeds((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError((e as Error)?.message || "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doSkip = async (s: ForumSeed) => {
    setBusyId(s.id);
    setError("");
    try {
      await skipForumSeed(s.id);
      setSeeds((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError((e as Error)?.message || "Skip failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <HStack gap={2} mb={1}>
        <Box color="nexzy.lightBlue">
          <FiMessageSquare />
        </Box>
        <Heading size="md" color="nexzy.white">
          Seeds to approve
        </Heading>
        {seeds.length > 0 && (
          <Text fontSize="sm" color="nexzy.gray.100">
            ({seeds.length})
          </Text>
        )}
      </HStack>
      <Text fontSize="sm" color="nexzy.gray.100" mb={5}>
        Discussion threads the newsroom proposed on publish. Approve to post the
        thread live, edit the text first if you like, or skip it (it won&apos;t
        be suggested again). Real user posts are unaffected.
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
      ) : seeds.length === 0 ? (
        <Box
          border="1px dashed"
          borderColor="whiteAlpha.300"
          borderRadius="xl"
          p={10}
          textAlign="center"
        >
          <Text color="nexzy.gray.100">
            No forum threads waiting for approval. New ones appear here when you
            publish an article.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {seeds.map((s) => {
            const url = publicUrl(s);
            const busy = busyId === s.id;
            return (
              <Box
                key={s.id}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                p={4}
              >
                <Box mb={3}>
                  <Text {...labelProps}>Thread title</Text>
                  <Input
                    value={s.title}
                    onChange={(e) => edit(s.id, { title: e.target.value })}
                    {...inputProps}
                  />
                </Box>
                <Box mb={3}>
                  <Text {...labelProps}>Thread body</Text>
                  <Textarea
                    value={s.content}
                    onChange={(e) => edit(s.id, { content: e.target.value })}
                    rows={4}
                    {...inputProps}
                  />
                </Box>
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
                      <FiExternalLink /> View article
                    </Link>
                  ) : (
                    <Box />
                  )}
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      color="nexzy.gray.100"
                      borderColor="whiteAlpha.300"
                      _hover={{ bg: "whiteAlpha.100" }}
                      disabled={busy}
                      onClick={() => doSkip(s)}
                    >
                      <FiX /> Skip
                    </Button>
                    <Button
                      size="sm"
                      bg="green.500"
                      color="white"
                      _hover={{ bg: "green.600" }}
                      loading={busy}
                      onClick={() => doApprove(s)}
                    >
                      <FiCheck /> Approve &amp; post
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
