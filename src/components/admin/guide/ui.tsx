"use client";

// Tiny shared controls for the guide admin (consistent look, readable
// contrast: gold buttons always use dark text).
import type { ReactNode } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Text,
  Textarea,
} from "@chakra-ui/react";

export const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  warn: "#FFB86B",
  gold: "#FFD700",
  ink: "#0b0e1d",
};

export const keyify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");

export function Card({
  title,
  aside,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      bg={C.surface}
      border="1px solid"
      borderColor={C.line}
      borderRadius="12px"
      p={4}
    >
      {(title || aside) && (
        <HStack justify="space-between" mb={3} gap={2} wrap="wrap">
          {title && (
            <Text fontWeight="700" color={C.text}>
              {title}
            </Text>
          )}
          {aside}
        </HStack>
      )}
      {children}
    </Box>
  );
}

export function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Text fontSize="xs" color={C.muted} fontWeight="600" mb={1}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text fontSize="xs" color={C.faint} mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

export function TextIn({
  value,
  onChange,
  placeholder,
  maxLength,
  onBlur,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  onBlur?: () => void;
  type?: string;
}) {
  return (
    <Input
      size="sm"
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      bg={C.raised}
      color={C.text}
      borderColor={C.line}
    />
  );
}

export function LongIn({
  value,
  onChange,
  rows = 4,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Textarea
      size="sm"
      rows={rows}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      bg={C.raised}
      color={C.text}
      borderColor={C.line}
    />
  );
}

export function Pick({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <NativeSelect.Root size="sm">
      <NativeSelect.Field
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        bg={C.raised}
        color={C.text}
        borderColor={C.line}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect.Field>
    </NativeSelect.Root>
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        color: C.text,
        fontSize: 13,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: C.gold, width: 15, height: 15 }}
      />
      {label}
    </label>
  );
}

export function Gold({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      size="sm"
      bg={C.gold}
      color={C.ink}
      fontWeight="700"
      _hover={{ bg: "#ffe24d" }}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      {children}
    </Button>
  );
}

export function Plain({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      borderColor={danger ? C.bad : C.line}
      color={danger ? C.bad : C.text}
      _hover={{ bg: "rgba(255,255,255,0.06)" }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function Problems({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <Box
      bg="rgba(255,138,128,0.08)"
      border="1px solid"
      borderColor="rgba(255,138,128,0.4)"
      borderRadius="10px"
      p={3}
    >
      {lines.map((l, i) => (
        <Text key={i} fontSize="sm" color={C.bad}>
          {l}
        </Text>
      ))}
    </Box>
  );
}

/** Sub-tabs inside an admin editor: one panel at a time instead of one long
 *  scroll. Gold = active (dark text for contrast). A warn dot marks a tab
 *  with problems so nothing hidden on another tab blocks a save silently. */
export function SubTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: K; label: string; count?: number; warn?: boolean }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <HStack
      gap={1}
      wrap="wrap"
      bg={C.surface}
      border="1px solid"
      borderColor={C.line}
      borderRadius="12px"
      p={1}
      role="tablist"
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Box
            key={t.key}
            as="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            px={3}
            py={1.5}
            borderRadius="9px"
            fontSize="sm"
            fontWeight={on ? "700" : "500"}
            bg={on ? C.gold : "transparent"}
            color={on ? C.ink : C.text}
            _hover={on ? {} : { bg: C.raised }}
            display="inline-flex"
            alignItems="center"
            gap={1.5}
          >
            {t.label}
            {t.count != null && (
              <Text
                as="span"
                fontSize="xs"
                color={on ? C.ink : C.muted}
                fontWeight="600"
              >
                {t.count}
              </Text>
            )}
            {t.warn && (
              <Box
                as="span"
                w="7px"
                h="7px"
                borderRadius="full"
                bg={C.warn}
                aria-label="Has problems"
              />
            )}
          </Box>
        );
      })}
    </HStack>
  );
}

/** A row of checkboxes for picking several values. */
export function MultiCheck({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Labeled label={label}>
      <Flex gap={3} wrap="wrap">
        {options.map((o) => (
          <Check
            key={o.value}
            label={o.label}
            checked={value.includes(o.value)}
            onChange={(on) =>
              onChange(
                on ? [...value, o.value] : value.filter((x) => x !== o.value),
              )
            }
          />
        ))}
        {!options.length && (
          <Text fontSize="xs" color={C.faint}>
            None available yet
          </Text>
        )}
      </Flex>
    </Labeled>
  );
}
