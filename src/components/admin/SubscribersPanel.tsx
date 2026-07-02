"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Input,
  Spinner,
} from "@chakra-ui/react";
import {
  getSubscribers,
  type SubscribersResult,
  type Subscriber,
} from "@/lib/admin/client";

const PAGE_SIZE = 25;

/**
 * Human-readable label for each capture point. `source` is the raw tag stored
 * when someone submits a form; this maps it to what they actually opted into so
 * the editor can tell a launch-notify signup from a blog-newsletter signup.
 */
const SOURCE_LABELS: Record<string, string> = {
  hero: "App launch updates (home)",
  cta: "App launch updates (footer)",
  blog: "News/blog newsletter",
  footer: "App launch updates (footer)",
  landing: "Landing (legacy)",
  unknown: "Unknown",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Box>
      <Text color="nexzy.white" fontWeight="700" fontSize="lg" lineHeight="1.1">
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
    </Box>
  );
}

function exportCsv(rows: Subscriber[]) {
  const header = ["email", "subscribed_to", "source", "status", "signed_up"];
  const body = rows.map((r) =>
    [
      r.email,
      sourceLabel(r.source),
      r.source,
      r.status,
      new Date(r.createdAt).toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexzy-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type StatusFilter = "all" | "active" | "unsubscribed";

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      borderWidth="1px"
      borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
    >
      {label}
    </Button>
  );
}

/**
 * Email list captured from the site. Signups only record a row (no outbound
 * email is sent) — this panel is where the editor reads, searches, filters and
 * exports them. Stays scannable as the list grows.
 */
export default function SubscribersPanel() {
  const [data, setData] = useState<SubscribersResult | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = () => {
    setRefreshing(true);
    getSubscribers()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) =>
        setError((e as Error)?.message || "Failed to load subscribers."),
      )
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetPage = () => setVisible(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (sourceFilter && s.source !== sourceFilter) return false;
      if (needle && !s.email.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, q, statusFilter, sourceFilter]);

  const shown = filtered.slice(0, visible);

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.blue"
      borderRadius="xl"
      p={5}
      mb={8}
    >
      <Flex align="baseline" justify="space-between" mb={1} gap={3}>
        <Heading size="lg" color="nexzy.white">
          Email subscribers
        </Heading>
        <HStack gap={2}>
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
          <Button
            size="xs"
            colorPalette="blue"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        </HStack>
      </Flex>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Everyone who signed up from the site. Signups only save a record — no
        email is sent. The “Subscribed to” column shows which form they used.
      </Text>

      {error ? (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      ) : !data ? (
        <Flex justify="center" py={6}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : (
        <>
          <SimpleGrid columns={{ base: 3 }} gap={4} mb={5}>
            <Metric label="Total" value={data.total} />
            <Metric label="Active" value={data.active} />
            <Metric label="Unsubscribed" value={data.unsubscribed} />
          </SimpleGrid>

          {/* Controls: search + status + source filters */}
          <Flex gap={3} mb={3} direction={{ base: "column", md: "row" }}>
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetPage();
              }}
              placeholder="Search email…"
              color="nexzy.white"
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              _placeholder={{ color: "nexzy.gray.100" }}
              size="sm"
              maxW={{ md: "300px" }}
            />
            <HStack gap={2} wrap="wrap">
              <FilterChip
                label="All"
                active={statusFilter === "all"}
                onClick={() => {
                  setStatusFilter("all");
                  resetPage();
                }}
              />
              <FilterChip
                label="Active"
                active={statusFilter === "active"}
                onClick={() => {
                  setStatusFilter("active");
                  resetPage();
                }}
              />
              <FilterChip
                label="Unsubscribed"
                active={statusFilter === "unsubscribed"}
                onClick={() => {
                  setStatusFilter("unsubscribed");
                  resetPage();
                }}
              />
            </HStack>
          </Flex>

          {data.bySource.length > 0 && (
            <HStack gap={2} wrap="wrap" mb={4}>
              <FilterChip
                label="Any source"
                active={sourceFilter === null}
                onClick={() => {
                  setSourceFilter(null);
                  resetPage();
                }}
              />
              {data.bySource.map((s) => (
                <FilterChip
                  key={s.source}
                  label={`${sourceLabel(s.source)} · ${s.count}`}
                  active={sourceFilter === s.source}
                  onClick={() => {
                    setSourceFilter(
                      sourceFilter === s.source ? null : s.source,
                    );
                    resetPage();
                  }}
                />
              ))}
            </HStack>
          )}

          <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
            Showing {shown.length} of {filtered.length}
            {filtered.length !== data.total ? ` (${data.total} total)` : ""}
          </Text>

          {filtered.length === 0 ? (
            <Text color="nexzy.gray.100" fontSize="sm">
              {data.total === 0 ? "No subscribers yet." : "No matches."}
            </Text>
          ) : (
            <>
              <Box overflowX="auto">
                <Box
                  as="table"
                  w="full"
                  css={{ borderCollapse: "collapse", fontSize: "0.85rem" }}
                >
                  <Box as="thead" color="nexzy.gray.100">
                    <Box as="tr" textAlign="left">
                      <Box as="th" py={1} pr={3} fontWeight="500">
                        Email
                      </Box>
                      <Box as="th" py={1} pr={3} fontWeight="500">
                        Subscribed to
                      </Box>
                      <Box as="th" py={1} pr={3} fontWeight="500">
                        Status
                      </Box>
                      <Box as="th" py={1} fontWeight="500">
                        Signed up
                      </Box>
                    </Box>
                  </Box>
                  <Box as="tbody" color="nexzy.white">
                    {shown.map((s) => (
                      <Box
                        as="tr"
                        key={s.id}
                        css={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <Box as="td" py={2} pr={3}>
                          {s.email}
                        </Box>
                        <Box as="td" py={2} pr={3} color="nexzy.gray.100">
                          {sourceLabel(s.source)}
                        </Box>
                        <Box
                          as="td"
                          py={2}
                          pr={3}
                          color={
                            s.status === "unsubscribed"
                              ? "nexzy.gray.100"
                              : "green.300"
                          }
                        >
                          {s.status}
                        </Box>
                        <Box as="td" py={2} color="nexzy.gray.100">
                          {fmtDate(s.createdAt)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
              {visible < filtered.length && (
                <Flex justify="center" mt={4}>
                  <Button
                    size="sm"
                    variant="outline"
                    color="nexzy.white"
                    borderColor="whiteAlpha.300"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Show more
                  </Button>
                </Flex>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
