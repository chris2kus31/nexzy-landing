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
} from "@chakra-ui/react";
import { FiShield, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import {
  getForumQueue,
  approveForumPost,
  removeForumPost,
  approveForumComment,
  removeForumComment,
  type ForumQueue,
  type ForumQueuePost,
  type ForumQueueComment,
  type ForumReport,
} from "@/lib/admin/client";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Tag({
  label,
  tone,
}: {
  label: string;
  tone: "flag" | "report" | "muted";
}) {
  const colors = {
    flag: { bg: "orange.500/15", border: "orange.400/50", fg: "orange.300" },
    report: { bg: "red.500/15", border: "red.400/50", fg: "red.300" },
    muted: {
      bg: "whiteAlpha.100",
      border: "whiteAlpha.300",
      fg: "nexzy.gray.100",
    },
  }[tone];
  return (
    <Box
      as="span"
      px={2}
      py="1px"
      borderRadius="full"
      bg={colors.bg}
      border="1px solid"
      borderColor={colors.border}
      color={colors.fg}
      fontSize="11px"
      fontWeight="600"
      whiteSpace="nowrap"
    >
      {label}
    </Box>
  );
}

function Reports({ reports }: { reports: ForumReport[] }) {
  if (!reports.length) return null;
  return (
    <VStack
      align="stretch"
      gap={1}
      mt={3}
      pt={3}
      borderTop="1px solid"
      borderColor="whiteAlpha.100"
    >
      {reports.slice(0, 5).map((r, i) => (
        <Text key={i} color="nexzy.gray.100" fontSize="xs">
          <Text as="span" color="red.300" fontWeight="600">
            {r.reason || "reported"}
          </Text>
          {r.additionalDetails ? ` — ${r.additionalDetails}` : ""}
          <Text as="span" color="whiteAlpha.500">
            {"  ·  "}
            {fmtDate(r.createdAt)}
          </Text>
        </Text>
      ))}
      {reports.length > 5 && (
        <Text color="whiteAlpha.500" fontSize="xs">
          +{reports.length - 5} more
        </Text>
      )}
    </VStack>
  );
}

function ActionButtons({
  busy,
  onApprove,
  onRemove,
}: {
  busy: boolean;
  onApprove: () => void;
  onRemove: () => void;
}) {
  return (
    <HStack gap={2} flexShrink={0}>
      <Button
        size="xs"
        variant="outline"
        color="green.300"
        borderColor="green.400/50"
        _hover={{ bg: "green.500/10" }}
        onClick={onApprove}
        loading={busy}
      >
        Approve
      </Button>
      <Button size="xs" colorPalette="red" onClick={onRemove} loading={busy}>
        Remove
      </Button>
    </HStack>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
      transition="border-color 0.15s"
      _hover={{ borderColor: "whiteAlpha.300" }}
    >
      {children}
    </Box>
  );
}

function StateBox({
  icon,
  iconColor,
  iconBg,
  iconBorder,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <VStack py={12} gap={3}>
      <Flex
        align="center"
        justify="center"
        boxSize="56px"
        borderRadius="full"
        bg={iconBg}
        border="1px solid"
        borderColor={iconBorder}
        color={iconColor}
        fontSize="26px"
      >
        {icon}
      </Flex>
      <Heading size="sm" color="nexzy.white">
        {title}
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" textAlign="center" maxW="380px">
        {children}
      </Text>
    </VStack>
  );
}

/**
 * Forum moderation queue: posts and comments that were AI-flagged or reported
 * by users. Approve clears the flag / dismisses reports; Remove soft-deletes
 * the content (retained in the DB for audit).
 */
export default function ForumModerationPanel() {
  const [data, setData] = useState<ForumQueue | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setRefreshing(true);
    getForumQueue()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError((e as Error)?.message || "Failed to load queue."))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      setError("");
      // Drop the actioned item from the local queue.
      setData((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.filter((p) => p.id !== id),
              comments: prev.comments.filter((c) => c.id !== id),
            }
          : prev,
      );
    } catch (e) {
      setError((e as Error)?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = (
    id: string,
    label: string,
    fn: (id: string, reason?: string) => Promise<unknown>,
  ) => {
    const reason = window.prompt(
      `Remove this ${label}? Optional reason for the audit log:`,
      "",
    );
    if (reason === null) return; // cancelled
    runAction(id, () => fn(id, reason || undefined));
  };

  const total = data ? data.posts.length + data.comments.length : 0;

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.blue"
      borderRadius="xl"
      p={5}
      mb={8}
    >
      <Flex align="center" justify="space-between" mb={1} gap={3}>
        <HStack gap={2}>
          <Box color="nexzy.blue" fontSize="20px" display="flex">
            <FiShield />
          </Box>
          <Heading size="lg" color="nexzy.white">
            Forum moderation
          </Heading>
          {data && total > 0 && (
            <Box
              as="span"
              px={2}
              py="1px"
              borderRadius="full"
              bg="red.500/15"
              border="1px solid"
              borderColor="red.400/50"
              color="red.300"
              fontSize="12px"
              fontWeight="700"
            >
              {total}
            </Box>
          )}
        </HStack>
        <Button
          size="xs"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={load}
          loading={refreshing}
          loadingText="…"
        >
          Refresh
        </Button>
      </Flex>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Posts and comments auto-flagged by moderation or reported by users.
        Approve clears the flag and dismisses reports; Remove soft-deletes the
        content (kept for audit).
      </Text>

      {error && (
        <Flex
          align="center"
          gap={2}
          bg="red.500/10"
          border="1px solid"
          borderColor="red.400/40"
          borderRadius="md"
          px={3}
          py={2}
          mb={4}
        >
          <Box color="red.300" fontSize="16px" display="flex">
            <FiAlertTriangle />
          </Box>
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        </Flex>
      )}

      {!data ? (
        <Flex justify="center" py={12}>
          <Spinner color="nexzy.blue" size="lg" />
        </Flex>
      ) : total === 0 ? (
        <StateBox
          icon={<FiCheckCircle />}
          iconColor="green.300"
          iconBg="green.500/10"
          iconBorder="green.400/40"
          title="All clear"
        >
          No flagged or reported content to review right now. New reports and
          auto-flagged posts will appear here.
        </StateBox>
      ) : (
        <VStack align="stretch" gap={6}>
          {/* Posts — only shown when there's something to review */}
          {data.posts.length > 0 && (
            <Box>
              <Heading size="sm" color="nexzy.gray.100" mb={3} letterSpacing="0.03em">
                POSTS · {data.posts.length}
              </Heading>
              <VStack align="stretch" gap={3}>
                {data.posts.map((p: ForumQueuePost) => (
                  <Card key={p.id}>
                    <Flex justify="space-between" gap={3} wrap="wrap">
                      <HStack gap={2} wrap="wrap">
                        <Text color="nexzy.white" fontWeight="600" fontSize="sm">
                          {p.author?.username || "Anonymous"}
                        </Text>
                        <Text color="whiteAlpha.500" fontSize="xs">
                          {fmtDate(p.createdAt)}
                        </Text>
                        {p.flagged && <Tag label="AI flagged" tone="flag" />}
                        {p.reportCount > 0 && (
                          <Tag
                            label={`${p.reportCount} report${p.reportCount === 1 ? "" : "s"}`}
                            tone="report"
                          />
                        )}
                        {(p.platform || p.console) && (
                          <Tag
                            label={[p.platform, p.console]
                              .filter(Boolean)
                              .join(" · ")}
                            tone="muted"
                          />
                        )}
                      </HStack>
                      <ActionButtons
                        busy={busyId === p.id}
                        onApprove={() =>
                          runAction(p.id, () => approveForumPost(p.id))
                        }
                        onRemove={() =>
                          confirmRemove(p.id, "post", removeForumPost)
                        }
                      />
                    </Flex>
                    <Text color="nexzy.white" fontWeight="600" mt={2}>
                      {p.title}
                    </Text>
                    <Text
                      color="nexzy.gray.100"
                      fontSize="sm"
                      mt={1}
                      lineClamp={4}
                    >
                      {p.content}
                    </Text>
                    <Reports reports={p.reports} />
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          {/* Comments — only shown when there's something to review */}
          {data.comments.length > 0 && (
            <Box>
              <Heading size="sm" color="nexzy.gray.100" mb={3} letterSpacing="0.03em">
                COMMENTS · {data.comments.length}
              </Heading>
              <VStack align="stretch" gap={3}>
                {data.comments.map((c: ForumQueueComment) => (
                  <Card key={c.id}>
                    <Flex justify="space-between" gap={3} wrap="wrap">
                      <HStack gap={2} wrap="wrap">
                        <Text color="nexzy.white" fontWeight="600" fontSize="sm">
                          {c.author?.username || "Anonymous"}
                        </Text>
                        <Text color="whiteAlpha.500" fontSize="xs">
                          {fmtDate(c.createdAt)}
                        </Text>
                        {c.flagged && <Tag label="AI flagged" tone="flag" />}
                        {c.reportCount > 0 && (
                          <Tag
                            label={`${c.reportCount} report${c.reportCount === 1 ? "" : "s"}`}
                            tone="report"
                          />
                        )}
                      </HStack>
                      <ActionButtons
                        busy={busyId === c.id}
                        onApprove={() =>
                          runAction(c.id, () => approveForumComment(c.id))
                        }
                        onRemove={() =>
                          confirmRemove(c.id, "comment", removeForumComment)
                        }
                      />
                    </Flex>
                    {c.post && (
                      <Text color="whiteAlpha.500" fontSize="xs" mt={1}>
                        on “{c.post.title}”
                      </Text>
                    )}
                    <Text
                      color="nexzy.gray.100"
                      fontSize="sm"
                      mt={1}
                      lineClamp={4}
                    >
                      {c.content}
                    </Text>
                    <Reports reports={c.reports} />
                  </Card>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}
