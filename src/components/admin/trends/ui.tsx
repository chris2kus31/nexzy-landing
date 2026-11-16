// Shared bits for Admin > Trends (list, editor, stats). Explicit colors: the
// admin theme is dark, so every button sets its own text and background.
"use client";

import type { ReactNode } from "react";
import { Box, Button, Text, chakra } from "@chakra-ui/react";
import type { TrendStatus } from "@/lib/admin/client-trends";

export const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
export const yellowBtn = {
  bg: "nexzy.yellow",
  color: "nexzy.navy",
  _hover: { bg: "nexzy.yellow", opacity: 0.9 },
};
export const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
export const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};
/** Native <select> styling (same as the other admin panels). */
export const nativeControl: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#EAF0FA",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const STATUS: Record<
  TrendStatus,
  { label: string; bg: string; color: string }
> = {
  live: { label: "LIVE", bg: "green.400", color: "nexzy.navy" },
  draft: { label: "DRAFT", bg: "whiteAlpha.300", color: "white" },
  ended: { label: "ENDED", bg: "gray.500", color: "white" },
  removed: { label: "REMOVED", bg: "red.500", color: "white" },
};

export function StatusChip({ status }: { status: TrendStatus }) {
  const s = STATUS[status];
  return (
    <Box
      as="span"
      display="inline-block"
      px={2.5}
      py="2px"
      borderRadius="full"
      fontSize="11px"
      fontWeight="800"
      letterSpacing="0.02em"
      bg={s.bg}
      color={s.color}
    >
      {s.label}
    </Box>
  );
}

export function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <Text color="nexzy.white" fontWeight="800" fontSize="md">
        {title}
      </Text>
      {sub && (
        <Text color="whiteAlpha.600" fontSize="xs" mt={0.5}>
          {sub}
        </Text>
      )}
      <Box mt={3}>{children}</Box>
    </Box>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="xs" fontWeight="600" color="whiteAlpha.800" mb={1}>
      {children}
    </Text>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="11px" color="whiteAlpha.600" mt={1}>
      {children}
    </Text>
  );
}

/** A row of mutually exclusive choices (yellow = selected). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <Box
      display="inline-flex"
      flexWrap="wrap"
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      borderRadius="md"
      overflow="hidden"
    >
      {options.map(([key, label]) => {
        const on = key === value;
        return (
          <Button
            key={key}
            size="sm"
            borderRadius="0"
            disabled={disabled}
            onClick={() => onChange(key)}
            bg={on ? "nexzy.yellow" : "transparent"}
            color={on ? "nexzy.navy" : "nexzy.gray.100"}
            fontWeight={on ? "700" : "500"}
            _hover={{ bg: on ? "nexzy.yellow" : "whiteAlpha.100" }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
}

/** On/off row with a label (a button, so it is keyboard reachable). */
export function Toggle({
  label,
  hint,
  on,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <chakra.button
      type="button"
      display="flex"
      gap={3}
      alignItems="flex-start"
      textAlign="left"
      disabled={disabled}
      onClick={() => onChange(!on)}
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? "not-allowed" : "pointer"}
      aria-pressed={on}
    >
      <Box
        as="span"
        flex="none"
        w="34px"
        h="20px"
        mt="1px"
        borderRadius="full"
        bg={on ? "green.400" : "whiteAlpha.300"}
        position="relative"
      >
        <Box
          as="span"
          position="absolute"
          top="2px"
          left={on ? "16px" : "2px"}
          w="16px"
          h="16px"
          borderRadius="full"
          bg="white"
          transition="left 0.15s"
        />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="nexzy.white">
          {label}
        </Text>
        {hint && (
          <Text fontSize="11px" color="whiteAlpha.600">
            {hint}
          </Text>
        )}
      </Box>
    </chakra.button>
  );
}

export function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Box
      flex="1"
      minW="140px"
      bg="whiteAlpha.50"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      px={4}
      py={3}
    >
      <Text fontSize="xs" color="whiteAlpha.700">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="800" color="nexzy.white">
        {value}
      </Text>
      {sub && (
        <Text fontSize="11px" color="green.300">
          {sub}
        </Text>
      )}
    </Box>
  );
}

export const num = (n: number) => n.toLocaleString("en-US");
