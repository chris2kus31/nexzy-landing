"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiCheck, FiLock, FiRotateCcw, FiShield, FiX } from "react-icons/fi";
import {
  getModerationHistory,
  getModerationSettings,
  runModerationCheck,
  saveModerationSettings,
  type ModerationCheckResult,
  type ModerationSettingChangeRow,
  type ModerationSettingRow,
} from "@/lib/admin/client";

// Same palette as Pulse so the admin reads as one system.
const C = {
  surface: "#222849",
  raised: "#2a3156",
  line: "rgba(255,255,255,0.08)",
  text: "#EDF2F7",
  muted: "#9AA3BF",
  faint: "#6B7394",
  good: "#7EE2A0",
  bad: "#FF8A80",
  warn: "#FFB86B",
  accent: "#4DA3FF",
};

const fmt = (n: number) => n.toFixed(2);

type Draft = Record<string, { threshold: number; useOpenAiFlag: boolean }>;

/**
 * Admin → Moderation (owner). One set of rules for every post and comment on
 * Nexzy: the score above which each kind of content is hidden, and whether
 * OpenAI's own yes/no also counts. The server enforces hard limits and logs
 * every change.
 */
export default function ModerationPanel() {
  const [rows, setRows] = useState<ModerationSettingRow[] | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [history, setHistory] = useState<ModerationSettingChangeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadErr, setLoadErr] = useState("");

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const [s, h] = await Promise.all([
        getModerationSettings(),
        getModerationHistory(),
      ]);
      setRows(s);
      setHistory(h);
      setDraft({});
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const labelOf = useMemo(
    () => new Map((rows ?? []).map((r) => [r.category, r.label])),
    [rows],
  );

  const changed = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        const d = draft[r.category];
        return (
          d &&
          (d.threshold !== r.threshold || d.useOpenAiFlag !== r.useOpenAiFlag)
        );
      }),
    [rows, draft],
  );

  const setRow = (
    r: ModerationSettingRow,
    patch: Partial<{ threshold: number; useOpenAiFlag: boolean }>,
  ) => {
    setMsg(null);
    setDraft((prev) => {
      const cur = prev[r.category] ?? {
        threshold: r.threshold,
        useOpenAiFlag: r.useOpenAiFlag,
      };
      return { ...prev, [r.category]: { ...cur, ...patch } };
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const saved = await saveModerationSettings(
        changed.map((r) => ({ category: r.category, ...draft[r.category] })),
      );
      setRows(saved);
      setDraft({});
      setHistory(await getModerationHistory());
      setMsg({
        ok: true,
        text: `Saved. Live on every post and comment within a minute.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack align="stretch" gap={8} maxW="980px">
      <Box>
        <Heading fontFamily="title" fontSize="2xl" color={C.text}>
          Moderation
        </Heading>
        <Text fontSize="sm" color={C.muted} mt={1} maxW="70ch">
          One set of rules for every post, comment, article comment and video
          comment. Each kind of content gets a score from 0 to 1; anything above
          your limit is hidden and sent to the review queue.
        </Text>
      </Box>

      <CheckSection />

      <Box>
        <Flex align="baseline" justify="space-between" wrap="wrap" gap={2}>
          <Heading fontFamily="title" fontSize="lg" color={C.text}>
            Rules
          </Heading>
          <Text fontSize="xs" color={C.faint}>
            Lower limit = stricter. Locked rules can only be tightened so far.
          </Text>
        </Flex>

        {loadErr && (
          <Text color={C.bad} fontSize="sm" mt={3}>
            Couldn&apos;t load the rules: {loadErr}
          </Text>
        )}
        {!rows ? (
          !loadErr && <Spinner color="nexzy.blue" mt={4} />
        ) : (
          <Box mt={3} bg={C.surface} borderRadius="14px" overflow="hidden">
            {rows.map((r, i) => (
              <RuleRow
                key={r.category}
                row={r}
                value={
                  draft[r.category] ?? {
                    threshold: r.threshold,
                    useOpenAiFlag: r.useOpenAiFlag,
                  }
                }
                isChanged={changed.some((c) => c.category === r.category)}
                first={i === 0}
                onChange={(patch) => setRow(r, patch)}
              />
            ))}
          </Box>
        )}

        {(changed.length > 0 || msg) && (
          <Flex
            position="sticky"
            bottom="12px"
            mt={4}
            align="center"
            gap={3}
            bg={changed.length ? C.raised : "transparent"}
            borderRadius="12px"
            px={changed.length ? 4 : 0}
            py={changed.length ? 3 : 0}
            wrap="wrap"
          >
            {changed.length > 0 && (
              <Text fontSize="sm" color={C.text}>
                {changed.length === 1
                  ? "1 rule changed"
                  : `${changed.length} rules changed`}
              </Text>
            )}
            {msg && (
              <Text fontSize="sm" color={msg.ok ? C.good : C.bad}>
                {msg.text}
              </Text>
            )}
            <Box flex="1" />
            {changed.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  color={C.muted}
                  onClick={() => {
                    setDraft({});
                    setMsg(null);
                  }}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  bg="nexzy.blue"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                  onClick={() => void save()}
                  loading={saving}
                >
                  Save changes
                </Button>
              </>
            )}
          </Flex>
        )}
      </Box>

      <Box>
        <Heading fontFamily="title" fontSize="lg" color={C.text}>
          Change history
        </Heading>
        {!history.length ? (
          <Text fontSize="sm" color={C.muted} mt={2}>
            No changes yet. Every rule is on its default.
          </Text>
        ) : (
          <VStack align="stretch" gap={0} mt={3}>
            {history.map((h) => (
              <Flex
                key={h.id}
                gap={4}
                py={2}
                borderBottom="1px solid"
                borderColor={C.line}
                fontSize="sm"
                wrap="wrap"
              >
                <Text color={C.faint} minW="150px">
                  {new Date(h.createdAt).toLocaleString("en-US", {
                    timeZone: "America/Chicago",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                <Text color={C.text} minW="200px">
                  {labelOf.get(h.category) ?? h.category}
                </Text>
                <Text color={C.muted}>{describeChange(h)}</Text>
                <Text color={C.faint} ml="auto">
                  {h.changedBy}
                </Text>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}

function describeChange(h: ModerationSettingChangeRow): string {
  const parts: string[] = [];
  if (h.oldThreshold === null || h.oldThreshold !== h.newThreshold) {
    parts.push(
      h.oldThreshold === null
        ? `limit set to ${fmt(h.newThreshold)}`
        : `limit ${fmt(h.oldThreshold)} to ${fmt(h.newThreshold)}`,
    );
  }
  if (
    h.oldUseOpenAiFlag === null ||
    h.oldUseOpenAiFlag !== h.newUseOpenAiFlag
  ) {
    parts.push(`OpenAI's own check ${h.newUseOpenAiFlag ? "on" : "off"}`);
  }
  return parts.join(", ");
}

function RuleRow({
  row,
  value,
  isChanged,
  first,
  onChange,
}: {
  row: ModerationSettingRow;
  value: { threshold: number; useOpenAiFlag: boolean };
  isChanged: boolean;
  first: boolean;
  onChange: (
    patch: Partial<{ threshold: number; useOpenAiFlag: boolean }>,
  ) => void;
}) {
  const atDefault =
    value.threshold === row.defaultThreshold &&
    value.useOpenAiFlag === row.defaultUseOpenAiFlag;
  const inputId = `mod-${row.category.replace(/\W/g, "-")}`;

  return (
    <Box
      display="grid"
      gridTemplateColumns={{
        base: "1fr",
        md: "minmax(220px, 1fr) 280px 200px 32px",
      }}
      columnGap={6}
      rowGap={3}
      px={5}
      py={4}
      borderTop={first ? "none" : "1px solid"}
      borderColor={C.line}
      bg={isChanged ? "rgba(77,163,255,0.07)" : "transparent"}
      alignItems="center"
    >
      <Box minW={0}>
        <HStack gap={2}>
          <label
            htmlFor={inputId}
            style={{ fontSize: 14, fontWeight: 600, color: C.text }}
          >
            {row.label}
          </label>
          {row.flagLocked && (
            <HStack
              gap={1}
              color={C.faint}
              fontSize="xs"
              title="Can only be tightened within its limits"
            >
              <FiLock /> <Text>locked</Text>
            </HStack>
          )}
        </HStack>
        <Text fontSize="xs" color={C.muted} mt={0.5}>
          {row.description}
        </Text>
      </Box>

      <Box>
        <Flex align="center" gap={3}>
          <input
            id={inputId}
            type="range"
            min={row.min}
            max={row.max}
            step={0.01}
            value={value.threshold}
            onChange={(e) => onChange({ threshold: Number(e.target.value) })}
            style={{ flex: 1, accentColor: C.accent }}
            aria-label={`${row.label} limit`}
          />
          <Text
            fontFamily="title"
            fontSize="lg"
            color={C.text}
            minW="44px"
            textAlign="right"
          >
            {fmt(value.threshold)}
          </Text>
        </Flex>
        <Flex justify="space-between" fontSize="11px" color={C.faint}>
          <Text>stricter {fmt(row.min)}</Text>
          <Text>default {fmt(row.defaultThreshold)}</Text>
          <Text>looser {fmt(row.max)}</Text>
        </Flex>
      </Box>

      <Box>
        {row.flagLocked ? (
          <Text fontSize="xs" color={C.faint}>
            OpenAI&apos;s own check always counts
          </Text>
        ) : (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 12,
              color: C.muted,
            }}
          >
            <input
              type="checkbox"
              checked={value.useOpenAiFlag}
              onChange={(e) => onChange({ useOpenAiFlag: e.target.checked })}
              style={{ accentColor: C.accent, width: 16, height: 16 }}
            />
            Also use OpenAI&apos;s own yes/no
          </label>
        )}
      </Box>

      <Box>
        {!atDefault && (
          <Button
            size="xs"
            variant="ghost"
            color={C.muted}
            _hover={{ color: C.text, bg: "whiteAlpha.100" }}
            onClick={() =>
              onChange({
                threshold: row.defaultThreshold,
                useOpenAiFlag: row.defaultUseOpenAiFlag,
              })
            }
            aria-label={`Reset ${row.label} to default`}
            title="Back to default"
          >
            <FiRotateCcw />
          </Button>
        )}
      </Box>
    </Box>
  );
}

function CheckSection() {
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

  const status = !res
    ? null
    : res.callFailed
      ? { text: "Not running", color: C.bad }
      : res.working
        ? { text: "Working as set", color: C.good }
        : { text: "Running, but a test didn't match", color: C.warn };

  return (
    <Box
      bg={C.surface}
      borderRadius="14px"
      p={5}
      borderLeft="3px solid"
      borderLeftColor={status?.color ?? C.line}
    >
      <Flex align="center" gap={3} wrap="wrap">
        <Box color={status?.color ?? C.muted}>
          <FiShield size={18} />
        </Box>
        <Box>
          <Text fontSize="md" fontWeight="600" color={C.text}>
            {status ? status.text : "Check that moderation is running"}
          </Text>
          <Text fontSize="xs" color={C.muted}>
            Sends 5 test sentences through the live rules. Free, and only runs
            when you click.
          </Text>
        </Box>
        <Box flex="1" />
        <Button
          size="sm"
          variant="outline"
          borderColor={C.line}
          color={C.text}
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={() => void run()}
          loading={busy}
        >
          Run check
        </Button>
      </Flex>

      {err && (
        <Text color={C.bad} fontSize="sm" mt={3}>
          {err}
        </Text>
      )}

      {res && (
        <Box mt={4}>
          {!res.keyConfigured && (
            <Text color={C.bad} fontSize="sm" mb={2}>
              OPENAI_API_KEY isn&apos;t set on the API, so posts go through
              unchecked.
            </Text>
          )}
          {res.samples.map((s) => (
            <Flex
              key={s.key}
              gap={4}
              py={2}
              borderTop="1px solid"
              borderColor={C.line}
              fontSize="sm"
              align="center"
              wrap="wrap"
            >
              <Box color={s.ok ? C.good : C.bad} flexShrink={0}>
                {s.ok ? <FiCheck /> : <FiX />}
              </Box>
              <Text color={C.text} minW="190px">
                {s.label}
              </Text>
              <Text color={C.muted} minW="140px">
                should be {s.expect === "block" ? "hidden" : "allowed"}
              </Text>
              {s.error ? (
                <Text color={C.bad}>check failed: {s.error}</Text>
              ) : (
                <>
                  <Text color={s.ok ? C.text : C.warn} minW="70px">
                    {s.blocked ? "hidden" : "allowed"}
                  </Text>
                  <Text color={C.faint} fontSize="xs">
                    {s.reasons.length
                      ? `by ${s.reasons.join(", ")}`
                      : s.topCategory
                        ? `highest: ${s.topCategory} ${s.topScore}`
                        : ""}
                  </Text>
                </>
              )}
            </Flex>
          ))}
          <Text fontSize="xs" color={C.faint} mt={3}>
            Last 7 days: {res.last7d.feedPostsHidden} of {res.last7d.feedPosts}{" "}
            posts hidden, {res.last7d.commentsHidden} comments and{" "}
            {res.last7d.articleCommentsHidden} article comments hidden. The
            check took {(res.latencyMs / 1000).toFixed(1)}s.
          </Text>
        </Box>
      )}
    </Box>
  );
}
