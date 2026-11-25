"use client";

import { useMemo } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  Input,
  NativeSelect,
} from "@chakra-ui/react";
import type { Lead } from "@/lib/admin/client";

/**
 * Leads board sort + filters. Pure client-side: the API returns the full open
 * lead set (fresh window, capped at 100), so sorting/filtering the in-memory
 * array changes nothing about which leads the desk surfaces.
 */

export type LeadSort = "hot" | "latest" | "oldest" | "sources";
export type Tri = "any" | "yes" | "no";
export type PubMode = "include" | "exclude";

export interface LeadFilters {
  sort: LeadSort;
  q: string;
  /** Publisher name (lowercased) -> include / exclude. */
  pubs: Record<string, PubMode>;
  origin: "any" | "firstParty" | "firehose";
  hasPrimary: Tri;
  multiSource: Tri;
  confidence: "any" | "high" | "medium" | "low";
  ownable: "any" | "ownable" | "commodity" | "untagged";
  hasVideo: Tri;
  treatment: "any" | "news" | "review";
  needsPaste: Tri;
}

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  sort: "hot",
  q: "",
  pubs: {},
  origin: "any",
  hasPrimary: "any",
  multiSource: "any",
  confidence: "any",
  ownable: "any",
  hasVideo: "any",
  treatment: "any",
  needsPaste: "any",
};

const norm = (s: string) => s.trim().toLowerCase();

const leadTime = (l: Lead) =>
  new Date(l.latestSourceDate || l.createdAt).getTime() || 0;

const leadPubs = (l: Lead) =>
  new Set((l.sources || []).map((s) => norm(s.name || "")).filter(Boolean));

const tri = (t: Tri, v: boolean) => t === "any" || (t === "yes") === v;

/** True when any filter (not sort) differs from the default. */
export function hasActiveFilters(f: LeadFilters): boolean {
  return (
    f.q.trim() !== "" ||
    Object.keys(f.pubs).length > 0 ||
    f.origin !== "any" ||
    f.hasPrimary !== "any" ||
    f.multiSource !== "any" ||
    f.confidence !== "any" ||
    f.ownable !== "any" ||
    f.hasVideo !== "any" ||
    f.treatment !== "any" ||
    f.needsPaste !== "any"
  );
}

export function applyLeadFilters(leads: Lead[], f: LeadFilters): Lead[] {
  const q = norm(f.q);
  const include = Object.keys(f.pubs).filter((p) => f.pubs[p] === "include");
  const exclude = Object.keys(f.pubs).filter((p) => f.pubs[p] === "exclude");

  const out = leads.filter((l) => {
    if (q) {
      const hay = [l.headline, l.workingTitle, l.whyItMatters]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (include.length || exclude.length) {
      const pubs = leadPubs(l);
      if (include.length && !include.some((p) => pubs.has(p))) return false;
      if (exclude.some((p) => pubs.has(p))) return false;
    }
    const firstParty =
      l.origin === "email" || l.origin === "page" || l.origin === "rss";
    if (f.origin === "firstParty" && !firstParty) return false;
    if (f.origin === "firehose" && firstParty) return false;
    if (
      !tri(
        f.hasPrimary,
        (l.sources || []).some((s) => s.tier === "primary"),
      )
    )
      return false;
    if (!tri(f.multiSource, (l.sourceCount || 0) >= 2)) return false;
    if (f.confidence !== "any" && l.confidenceFacts !== f.confidence)
      return false;
    if (f.ownable === "commodity" && l.ownable !== "none") return false;
    if (f.ownable === "ownable" && (!l.ownable || l.ownable === "none"))
      return false;
    if (f.ownable === "untagged" && l.ownable) return false;
    if (!tri(f.hasVideo, !!l.youtubeUrl)) return false;
    if (
      f.treatment !== "any" &&
      (l.suggestedTreatment || "news") !== f.treatment
    )
      return false;
    if (!tri(f.needsPaste, !!l.needsSourcePaste)) return false;
    return true;
  });

  // "hot" keeps the API order (trendScore, then freshest source).
  if (f.sort === "latest") out.sort((a, b) => leadTime(b) - leadTime(a));
  else if (f.sort === "oldest") out.sort((a, b) => leadTime(a) - leadTime(b));
  else if (f.sort === "sources")
    out.sort(
      (a, b) =>
        (b.sourceCount || 0) - (a.sourceCount || 0) ||
        leadTime(b) - leadTime(a),
    );
  return out;
}

/* ---------- UI ---------- */

function chipStyle(state: "off" | "on" | "exclude") {
  if (state === "on")
    return {
      bg: "nexzy.blue",
      color: "white",
      borderColor: "nexzy.blue",
      _hover: { bg: "nexzy.blue" },
    };
  if (state === "exclude")
    return {
      bg: "red.700",
      color: "white",
      borderColor: "red.700",
      textDecoration: "line-through",
      _hover: { bg: "red.700" },
    };
  return {
    bg: "transparent",
    color: "nexzy.gray.100",
    borderColor: "whiteAlpha.300",
    _hover: { bg: "whiteAlpha.100" },
  };
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <HStack gap={1}>
      <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600">
        {label}:
      </Text>
      <NativeSelect.Root size="xs" width="auto">
        <NativeSelect.Field
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          bg="whiteAlpha.50"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              style={{ background: "#111", color: "#fff" }}
            >
              {o.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </HStack>
  );
}

const TRI: { value: Tri; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function LeadsFilterBar({
  leads,
  filters,
  onChange,
  shown,
}: {
  leads: Lead[];
  filters: LeadFilters;
  onChange: (f: LeadFilters) => void;
  shown: number;
}) {
  const set = <K extends keyof LeadFilters>(k: K, v: LeadFilters[K]) =>
    onChange({ ...filters, [k]: v });

  // Publishers present in the loaded leads, with lead counts (most first).
  const publishers = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const l of leads) {
      const seen = new Set<string>();
      for (const s of l.sources || []) {
        const key = norm(s.name || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const cur = counts.get(key);
        if (cur) cur.n += 1;
        else counts.set(key, { name: s.name.trim(), n: 1 });
      }
    }
    return [...counts.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [leads]);

  // Click cycles: off -> include -> exclude -> off.
  const cyclePub = (key: string) => {
    const next = { ...filters.pubs };
    const cur = next[key];
    if (!cur) next[key] = "include";
    else if (cur === "include") next[key] = "exclude";
    else delete next[key];
    set("pubs", next);
  };

  const active = hasActiveFilters(filters);

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={4}
      py={3}
      mb={4}
    >
      <Flex gap={3} wrap="wrap" align="center" mb={3}>
        <Input
          size="xs"
          maxW="260px"
          placeholder="Search headlines"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          color="nexzy.white"
          borderColor="whiteAlpha.300"
        />
        <Select
          label="Sort"
          value={filters.sort}
          onChange={(v) => set("sort", v)}
          options={[
            { value: "hot", label: "Hottest" },
            { value: "latest", label: "Latest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "sources", label: "Most sources" },
          ]}
        />
        <Select
          label="Type"
          value={filters.origin}
          onChange={(v) => set("origin", v)}
          options={[
            { value: "any", label: "All" },
            { value: "firstParty", label: "First-party (email/page/rss)" },
            { value: "firehose", label: "RSS firehose" },
          ]}
        />
        <Select
          label="Primary source"
          value={filters.hasPrimary}
          onChange={(v) => set("hasPrimary", v)}
          options={TRI}
        />
        <Select
          label="2+ sources"
          value={filters.multiSource}
          onChange={(v) => set("multiSource", v)}
          options={TRI}
        />
        <Select
          label="Confidence"
          value={filters.confidence}
          onChange={(v) => set("confidence", v)}
          options={[
            { value: "any", label: "Any" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <Select
          label="Angle"
          value={filters.ownable}
          onChange={(v) => set("ownable", v)}
          options={[
            { value: "any", label: "Any" },
            { value: "ownable", label: "Ownable" },
            { value: "commodity", label: "Commodity" },
            { value: "untagged", label: "Not analyzed" },
          ]}
        />
        <Select
          label="Video"
          value={filters.hasVideo}
          onChange={(v) => set("hasVideo", v)}
          options={TRI}
        />
        <Select
          label="Treatment"
          value={filters.treatment}
          onChange={(v) => set("treatment", v)}
          options={[
            { value: "any", label: "Any" },
            { value: "news", label: "News" },
            { value: "review", label: "Review" },
          ]}
        />
        <Select
          label="Needs paste"
          value={filters.needsPaste}
          onChange={(v) => set("needsPaste", v)}
          options={TRI}
        />
      </Flex>

      {publishers.length > 0 && (
        <Box mb={2}>
          <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600" mb={1}>
            Reported by (click: show only, again: hide, again: clear):
          </Text>
          <HStack gap={2} wrap="wrap">
            {publishers.map((p) => {
              const mode = filters.pubs[p.key];
              const state =
                mode === "include"
                  ? "on"
                  : mode === "exclude"
                    ? "exclude"
                    : "off";
              return (
                <Button
                  key={p.key}
                  size="xs"
                  borderWidth="1px"
                  onClick={() => cyclePub(p.key)}
                  {...chipStyle(state)}
                >
                  {p.name} ({p.n})
                </Button>
              );
            })}
          </HStack>
        </Box>
      )}

      <Flex align="center" gap={3} mt={2}>
        <Text color="nexzy.gray.100" fontSize="xs">
          Showing {shown} of {leads.length}
        </Text>
        {(active || filters.sort !== "hot") && (
          <Button
            size="xs"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => onChange(DEFAULT_LEAD_FILTERS)}
          >
            Clear filters
          </Button>
        )}
      </Flex>
    </Box>
  );
}
