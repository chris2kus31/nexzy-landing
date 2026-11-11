"use client";

// Admin -> Mega hubs -> Wording. Every label a mega hub shows, on the website
// and in the app, comes from the API's catalog. This editor sets overrides
// for one scope: "default" (every hub, owner only) or one game. A blank
// field means "use what it inherits" (the game inherits the default
// wording, the default inherits the built-in text). Tokens like {game} are
// filled in by the page; the API refuses any token a label doesn't allow,
// and a save from a stale tab (someone saved since you opened it).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiRotateCcw } from "react-icons/fi";
import {
  getHubCopy,
  getHubCopyCatalog,
  HubCopySaveError,
  saveHubCopy,
  type HubCopyCatalog,
  type HubCopyKey,
  type HubCopyScope,
} from "@/lib/admin/client";
import {
  C,
  Card,
  Check,
  Gold,
  Pick,
  Plain,
  Problems,
} from "@/components/admin/guide/ui";

// One catalog per page load: it only changes with an API deploy.
let catalogOnce: Promise<HubCopyCatalog> | null = null;
const loadCatalog = () => {
  if (!catalogOnce) {
    catalogOnce = getHubCopyCatalog().catch((e) => {
      catalogOnce = null;
      throw e;
    });
  }
  return catalogOnce;
};

const TOKEN_RE = /\{([a-zA-Z]+)\}/g;
const tokensIn = (s: string) => [
  ...new Set([...s.matchAll(TOKEN_RE)].map((m) => m[1])),
];

/** What each token becomes on the page (shown in the help and previews). */
const TOKEN_HELP: Record<string, { what: string; sample: string }> = {
  game: {
    what: "the game's short name (first Other name, else its name)",
    sample: "",
  },
  count: { what: "a number, like a player count", sample: "1,240" },
  n: { what: "a small number", sample: "3" },
  date: { what: "a date", sample: "Nov 19, 2026" },
  score: { what: "a score or score range", sample: "9.1" },
  user: { what: "a username", sample: "player1" },
  title: { what: "a video title", sample: "Trailer 3" },
  label: { what: "a rating criterion name", sample: "Fun" },
  live: { what: "rooms live now", sample: "2" },
  upcoming: { what: "rooms coming up", sample: "5" },
  max: { what: "a room's size", sample: "4" },
};

type Surface = "all" | "web" | "app";

export default function HubWordingEditor({
  scope,
  gameName,
}: {
  /** "default" or a game id. */
  scope: string;
  /** The game's short name, for previews (game scope). */
  gameName?: string;
}) {
  const isDefault = scope === "default";
  const [catalog, setCatalog] = useState<HubCopyCatalog | null>(null);
  const [base, setBase] = useState<HubCopyScope | null>(null);
  const [inheritedOverrides, setInheritedOverrides] = useState<
    Record<string, string>
  >({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [surface, setSurface] = useState<Surface>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoadError(null);
    setProblems([]);
    setConflict(false);
    try {
      const [cat, mine, inherited] = await Promise.all([
        loadCatalog(),
        getHubCopy(scope),
        isDefault ? Promise.resolve(null) : getHubCopy("default"),
      ]);
      setCatalog(cat);
      setBase(mine);
      setDraft({ ...mine.overrides });
      setInheritedOverrides(inherited?.overrides ?? {});
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [scope, isDefault]);

  useEffect(() => {
    void load();
  }, [load]);

  const readOnly = isDefault && catalog ? !catalog.canEditDefault : false;
  const sampleGame = gameName || "GTA 6";

  const inheritedOf = useCallback(
    (k: HubCopyKey) =>
      isDefault ? k.default : (inheritedOverrides[k.key] ?? k.default),
    [isDefault, inheritedOverrides],
  );

  const keyProblem = (k: HubCopyKey, v: string): string | null => {
    if (!v.trim()) return null;
    if (v.trim().length > k.max) return `${k.max} characters max`;
    const bad = tokensIn(v).filter((t) => !k.tokens.includes(t));
    if (bad.length)
      return `Unknown ${bad.map((t) => `{${t}}`).join(", ")}${
        k.tokens.length
          ? `. Allowed: ${k.tokens.map((t) => `{${t}}`).join(", ")}`
          : ". This text takes no tokens."
      }`;
    return null;
  };

  const changedKeys = useMemo(
    () =>
      new Set(
        Object.entries(draft)
          .filter(([, v]) => v.trim())
          .map(([k]) => k),
      ),
    [draft],
  );
  const dirty = useMemo(() => {
    if (!base) return false;
    const a = Object.entries(draft).filter(([, v]) => v.trim());
    const b = Object.entries(base.overrides);
    if (a.length !== b.length) return true;
    return a.some(([k, v]) => base.overrides[k] !== v.trim());
  }, [draft, base]);

  const localProblems = useMemo(() => {
    if (!catalog) return [];
    const out: string[] = [];
    for (const k of catalog.keys) {
      const p = keyProblem(k, draft[k.key] ?? "");
      if (p) out.push(`${k.key}: ${p}`);
    }
    return out;
    // keyProblem only reads its arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, draft]);

  const groups = useMemo(() => {
    if (!catalog) return [];
    const needle = q.trim().toLowerCase();
    return catalog.groups
      .map((g) => ({
        ...g,
        keys: catalog.keys.filter(
          (k) =>
            k.group === g.key &&
            (surface === "all" ||
              k.surface === "both" ||
              k.surface === surface) &&
            (!onlyChanged || changedKeys.has(k.key)) &&
            (!needle ||
              k.key.toLowerCase().includes(needle) ||
              inheritedOf(k).toLowerCase().includes(needle) ||
              (draft[k.key] ?? "").toLowerCase().includes(needle)),
        ),
      }))
      .filter((g) => g.keys.length > 0);
  }, [catalog, q, surface, onlyChanged, changedKeys, draft, inheritedOf]);

  const save = async () => {
    if (!base || readOnly || localProblems.length) return;
    setSaving(true);
    setProblems([]);
    setConflict(false);
    setSaved(null);
    try {
      const overrides: Record<string, string> = {};
      for (const [k, v] of Object.entries(draft))
        if (v.trim()) overrides[k] = v.trim();
      const next = await saveHubCopy(scope, overrides, base.rev);
      setBase(next);
      setDraft({ ...next.overrides });
      setSaved(
        "Saved. Pages refresh in a few seconds; the app picks it up within minutes.",
      );
    } catch (e) {
      if (e instanceof HubCopySaveError) {
        setProblems(e.lines);
        setConflict(e.status === 409);
      } else {
        setProblems([(e as Error).message]);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError)
    return (
      <Card title="Wording">
        <Problems lines={[loadError]} />
        <Box mt={3}>
          <Plain onClick={() => void load()}>Try again</Plain>
        </Box>
      </Card>
    );
  if (!catalog || !base) return <Spinner />;

  const toggle = (g: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });
  const searching = !!q.trim() || onlyChanged;

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Card
        title={
          isDefault
            ? "Default wording (every hub)"
            : `Wording for ${gameName || "this game"}`
        }
        aside={
          <HStack gap={2}>
            {dirty && !readOnly && (
              <Plain
                onClick={() => {
                  setDraft({ ...base.overrides });
                  setProblems([]);
                  setConflict(false);
                }}
                disabled={saving}
              >
                Discard
              </Plain>
            )}
            {!readOnly && (
              <Gold
                onClick={() => void save()}
                disabled={!dirty || localProblems.length > 0}
                loading={saving}
              >
                Save wording
              </Gold>
            )}
          </HStack>
        }
      >
        <Text fontSize="sm" color={C.muted}>
          {isDefault
            ? "What every mega hub says, on the website and in the app. A blank field uses the built-in text. Each game can still change any of it in its own Wording tab."
            : "What this hub says, on the website and in the app. A blank field uses the default wording (Mega hubs > Default wording)."}{" "}
          Tokens in braces are filled in on the page:{" "}
          {Object.entries(TOKEN_HELP)
            .map(([t, h]) => `{${t}} ${h.what}`)
            .join("; ")}
          .
        </Text>
        <Text fontSize="xs" color={C.faint} mt={2}>
          {changedKeys.size} of {catalog.keys.length} changed
          {base.updatedAt
            ? ` · last saved ${new Date(base.updatedAt).toLocaleString()}${base.updatedBy ? ` by ${base.updatedBy}` : ""}`
            : " · never saved"}
        </Text>
        {readOnly && (
          <Text fontSize="sm" color={C.warn} mt={2}>
            Only the owner can change the default wording. You can change a
            game's own wording in its Wording tab.
          </Text>
        )}
        <Flex gap={3} mt={4} wrap="wrap" align="center">
          <Box flex="1" minW="220px">
            <Input
              size="sm"
              placeholder="Search keys or text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              bg={C.raised}
              color={C.text}
              borderColor={C.line}
            />
          </Box>
          <Box w="160px">
            <Pick
              label="Where it shows"
              value={surface}
              onChange={(v) => setSurface(v as Surface)}
              options={[
                { value: "all", label: "Website and app" },
                { value: "web", label: "Website" },
                { value: "app", label: "App" },
              ]}
            />
          </Box>
          <Check
            checked={onlyChanged}
            onChange={setOnlyChanged}
            label="Only changed"
          />
        </Flex>
        {(problems.length > 0 || localProblems.length > 0) && (
          <Box mt={4}>
            <Problems
              lines={problems.length ? problems : localProblems.slice(0, 8)}
            />
            {conflict && (
              <Box mt={2}>
                <Plain onClick={() => void load()}>
                  Reload the latest wording
                </Plain>
              </Box>
            )}
          </Box>
        )}
        {saved && !dirty && (
          <Text fontSize="sm" color={C.good} mt={3}>
            {saved}
          </Text>
        )}
      </Card>

      {groups.length === 0 && (
        <Text fontSize="sm" color={C.muted}>
          Nothing matches.
        </Text>
      )}

      {groups.map((g) => {
        const isOpen = searching || open.has(g.key);
        const changed = g.keys.filter((k) => changedKeys.has(k.key)).length;
        return (
          <Box
            key={g.key}
            bg={C.surface}
            border="1px solid"
            borderColor={C.line}
            borderRadius="12px"
          >
            <Flex
              as="button"
              onClick={() => toggle(g.key)}
              aria-expanded={isOpen}
              w="full"
              align="center"
              gap={2}
              px={4}
              py={3}
              textAlign="left"
              color={C.text}
            >
              {isOpen ? (
                <FiChevronDown aria-hidden />
              ) : (
                <FiChevronRight aria-hidden />
              )}
              <Text fontWeight="700" flex="1">
                {g.label}
              </Text>
              <Text fontSize="xs" color={changed ? C.gold : C.faint}>
                {changed ? `${changed} changed · ` : ""}
                {g.keys.length}
              </Text>
            </Flex>
            {isOpen && (
              <Box px={4} pb={4} display="flex" flexDirection="column" gap={4}>
                {g.keys.map((k) => (
                  <WordingRow
                    key={k.key}
                    k={k}
                    value={draft[k.key] ?? ""}
                    inherited={inheritedOf(k)}
                    sampleGame={sampleGame}
                    readOnly={readOnly}
                    problem={keyProblem(k, draft[k.key] ?? "")}
                    onChange={(v) => {
                      setSaved(null);
                      setDraft((d) => ({ ...d, [k.key]: v }));
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function fill(text: string, sampleGame: string): string {
  return text.replace(TOKEN_RE, (m, t: string) =>
    t === "game" ? sampleGame : (TOKEN_HELP[t]?.sample ?? m),
  );
}

function WordingRow({
  k,
  value,
  inherited,
  sampleGame,
  readOnly,
  problem,
  onChange,
}: {
  k: HubCopyKey;
  value: string;
  inherited: string;
  sampleGame: string;
  readOnly: boolean;
  problem: string | null;
  onChange: (v: string) => void;
}) {
  const shown = value.trim() ? value : inherited;
  const hasTokens = tokensIn(shown).length > 0;
  return (
    <Box>
      <HStack gap={2} mb={1} wrap="wrap">
        <Text fontSize="xs" color={C.faint} fontFamily="mono">
          {k.key}
        </Text>
        {k.surface !== "both" && (
          <Badge variant="subtle" colorPalette="purple" size="sm">
            {k.surface === "web" ? "Website only" : "App only"}
          </Badge>
        )}
        {value.trim() && (
          <Badge variant="subtle" colorPalette="yellow" size="sm">
            Changed
          </Badge>
        )}
      </HStack>
      <HStack gap={2} align="start">
        <Input
          size="sm"
          value={value}
          placeholder={inherited}
          maxLength={k.max}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          bg={C.raised}
          color={C.text}
          borderColor={problem ? C.bad : C.line}
          _placeholder={{ color: C.faint }}
          aria-label={k.key}
        />
        {value && !readOnly && (
          <Box
            as="button"
            onClick={() => onChange("")}
            title="Use the inherited text"
            aria-label={`Reset ${k.key}`}
            color={C.muted}
            p={2}
            _hover={{ color: C.text }}
          >
            <FiRotateCcw />
          </Box>
        )}
      </HStack>
      <Flex justify="space-between" gap={3} mt={1} wrap="wrap">
        <HStack gap={1} wrap="wrap">
          {!readOnly &&
            k.tokens.map((t) => (
              <Box
                key={t}
                as="button"
                onClick={() => {
                  const cur = value || inherited;
                  onChange(
                    cur.endsWith(" ") || !cur
                      ? `${cur}{${t}}`
                      : `${cur} {${t}}`,
                  );
                }}
                title={`Insert {${t}}: ${TOKEN_HELP[t]?.what ?? t}`}
                fontSize="xs"
                px={2}
                py={0.5}
                borderRadius="999px"
                bg={C.raised}
                color={C.muted}
                _hover={{ color: C.text }}
              >
                {`{${t}}`}
              </Box>
            ))}
        </HStack>
        <Text fontSize="xs" color={shown.length > k.max ? C.bad : C.faint}>
          {shown.length}/{k.max}
        </Text>
      </Flex>
      {problem && (
        <Text fontSize="xs" color={C.bad} mt={1}>
          {problem}
        </Text>
      )}
      {hasTokens && !problem && (
        <Text fontSize="xs" color={C.muted} mt={1}>
          Shows as: {fill(shown, sampleGame)}
        </Text>
      )}
    </Box>
  );
}
