"use client";

import type { ReactNode } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
} from "@chakra-ui/react";

/** Thousands-separated integer. */
export function num(n: number): string {
  return (n ?? 0).toLocaleString();
}

/** A stat card: big value, small label, optional sub-line. */
export function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Box bg="whiteAlpha.50" borderRadius="lg" px={4} py={3}>
      <Text
        color="nexzy.white"
        fontSize="2xl"
        fontWeight="700"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="nexzy.gray.100" fontSize="xs">
        {label}
      </Text>
      {sub && (
        <Text color="nexzy.gray.100" fontSize="xs" opacity={0.7} mt={0.5}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

/** A titled, bordered panel. */
export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Flex align="center" justify="space-between" mb={3} gap={2}>
        <Heading size="xs" color="nexzy.gray.100" textTransform="uppercase">
          {title}
        </Heading>
        {action}
      </Flex>
      {children}
    </Box>
  );
}

/** A single labeled horizontal bar (value drives the fill vs. `max`). */
export function Bar({
  label,
  value,
  max,
  suffix,
  accent = "nexzy.blue",
  emphasize = false,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  accent?: string;
  emphasize?: boolean;
}) {
  return (
    <Box>
      <Flex justify="space-between" mb={1} gap={2}>
        <Text
          color={emphasize ? "nexzy.white" : "nexzy.gray.100"}
          fontSize="sm"
          fontWeight={emphasize ? "700" : "500"}
          lineClamp={1}
        >
          {label}
        </Text>
        <Text color="nexzy.gray.100" fontSize="sm" flexShrink={0}>
          {num(value)}
          {suffix ? (
            <Text as="span" opacity={0.6} fontSize="xs">
              {" "}
              {suffix}
            </Text>
          ) : null}
        </Text>
      </Flex>
      <Box h="6px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
        <Box
          h="full"
          bg={accent}
          w={`${Math.max(2, max > 0 ? (value / max) * 100 : 0)}%`}
        />
      </Box>
    </Box>
  );
}

/** Ranked list of bars from {label, value} rows, sorted by value desc. */
export function BarList({
  rows,
  accent,
  emptyText = "No data yet.",
}: {
  rows: { label: string; value: number; suffix?: string }[];
  accent?: string;
  emptyText?: string;
}) {
  if (!rows.length) {
    return (
      <Text color="nexzy.gray.100" fontSize="sm">
        {emptyText}
      </Text>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <VStack align="stretch" gap={2.5}>
      {rows.map((r, i) => (
        <Bar
          key={`${r.label}-${i}`}
          label={r.label}
          value={r.value}
          max={max}
          suffix={r.suffix}
          accent={accent}
        />
      ))}
    </VStack>
  );
}

/**
 * Server-side pager: shows "from–to of total" + Prev/Next. `offset`/`limit` are
 * the current window; `onPage` receives the new offset.
 */
export function Pager({
  offset,
  limit,
  total,
  onPage,
  loading = false,
}: {
  offset: number;
  limit: number;
  total: number;
  onPage: (nextOffset: number) => void;
  loading?: boolean;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const btn = {
    size: "xs" as const,
    variant: "outline" as const,
    color: "nexzy.white",
    borderColor: "whiteAlpha.300",
    _hover: { bg: "whiteAlpha.100" },
  };
  return (
    <Flex align="center" justify="space-between" pt={3} wrap="wrap" gap={2}>
      <Text color="nexzy.gray.100" fontSize="xs">
        {from}–{to} of {num(total)}
      </Text>
      <HStack gap={2}>
        <Button
          {...btn}
          disabled={offset <= 0 || loading}
          onClick={() => onPage(Math.max(0, offset - limit))}
        >
          ← Prev
        </Button>
        <Text color="nexzy.gray.100" fontSize="xs">
          {page} / {pages}
        </Text>
        <Button
          {...btn}
          disabled={to >= total || loading}
          onClick={() => onPage(offset + limit)}
        >
          Next →
        </Button>
      </HStack>
    </Flex>
  );
}
