"use client";
// Admin > Trends > editor: hashtag, title, what people do (pick games, rank,
// a reason per game), which games they can pick, colors and publishing. The
// right side is the server's own render of the share image with sample
// games, refreshed as you type. Steps, hashtag and link lock once a trend has
// entries (the API refuses the change too).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FiArrowLeft, FiX } from "react-icons/fi";
import {
  getGameTaxonomy,
  searchGamesForLink,
  type GameLite,
  type GameTaxonomy,
} from "@/lib/admin/client";
import {
  createTrend,
  getTrend,
  previewTrend,
  setTrendStatus,
  updateTrend,
  type AdminTrend,
  type TrendGameLite,
  type TrendInput,
  type TrendShape,
  type TrendSource,
  type TrendStatus,
  type TrendStep,
} from "@/lib/admin/client-trends";
import {
  FieldLabel,
  Hint,
  Section,
  Segmented,
  StatusChip,
  Toggle,
  inputProps,
  nativeControl,
  outlineBtn,
  primaryBtn,
} from "@/components/admin/trends/ui";

/** The renderer's defaults (nexzy-api trend-layouts DEFAULT_THEME). */
const DEFAULT_THEME = {
  accent: "#FFD24A",
  background: "#151935",
  card: "#232A52",
};
const MAX_LIST = 300;
/** Games on the drop's card at /drops until people have picked. */
const MAX_CARD_GAMES = 3;
const HEX = /^#[0-9a-f]{6}$/i;

type SourceKind = TrendSource["kind"];

interface Form {
  hashtag: string;
  slug: string;
  slugTouched: boolean;
  title: string;
  description: string;
  pickMin: string;
  pickMax: string;
  rank: boolean;
  reason: boolean;
  reasonMax: string;
  sourceKind: SourceKind;
  parentPlatform: string;
  genre: string;
  yearFrom: string;
  yearTo: string;
  query: string;
  listGames: TrendGameLite[];
  cardGames: TrendGameLite[];
  accent: string;
  background: string;
  card: string;
  startsAt: string;
  endsAt: string;
  featured: boolean;
  sortWeight: string;
}

const EMPTY: Form = {
  hashtag: "",
  slug: "",
  slugTouched: false,
  title: "",
  description: "",
  pickMin: "3",
  pickMax: "9",
  rank: true,
  reason: false,
  reasonMax: "140",
  sourceKind: "any",
  parentPlatform: "",
  genre: "",
  yearFrom: "",
  yearTo: "",
  query: "",
  listGames: [],
  cardGames: [],
  ...DEFAULT_THEME,
  startsAt: "",
  endsAt: "",
  featured: false,
  sortWeight: "0",
};

/** "#GameDNA" -> "game-dna" (the default link). */
export function slugFromHashtag(tag: string): string {
  return tag
    .replace(/^#/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO -> the value a datetime-local input wants (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string): string | null =>
  v ? new Date(v).toISOString() : null;

/** Steps this editor can show and change. Anything else (tiers, this or
 *  that, sliders, a reason per entry) was made through the API: shown, kept,
 *  never rewritten here. */
function isEditableSteps(steps: TrendStep[]): boolean {
  return (
    steps.some((s) => s.kind === "pickGames") &&
    steps.every(
      (s) =>
        s.kind === "pickGames" ||
        s.kind === "rank" ||
        (s.kind === "reason" && s.per === "pick"),
    )
  );
}

function formFrom(
  t: AdminTrend,
  listGames: TrendGameLite[],
  cardGames: TrendGameLite[],
): Form {
  const steps = t.steps?.steps ?? [];
  const pick = steps.find((s) => s.kind === "pickGames");
  const reason = steps.find((s) => s.kind === "reason");
  const src = t.source ?? { kind: "any" };
  const f = src.kind === "filter" ? src : null;
  return {
    hashtag: `#${t.hashtagDisplay}`,
    slug: t.slug,
    slugTouched: true,
    title: t.title,
    description: t.description ?? "",
    pickMin: String(pick && pick.kind === "pickGames" ? pick.min : 3),
    pickMax: String(pick && pick.kind === "pickGames" ? pick.max : 9),
    rank: steps.some((s) => s.kind === "rank"),
    reason: !!reason,
    reasonMax: String(reason && reason.kind === "reason" ? reason.maxLen : 140),
    sourceKind: src.kind,
    parentPlatform: f?.parentPlatform ?? "",
    genre: f?.genre ?? "",
    yearFrom: f?.yearFrom ? String(f.yearFrom) : "",
    yearTo: f?.yearTo ? String(f.yearTo) : "",
    query: f?.query ?? "",
    listGames,
    cardGames,
    accent: t.theme?.accent ?? DEFAULT_THEME.accent,
    background: t.theme?.background ?? DEFAULT_THEME.background,
    card: t.theme?.card ?? DEFAULT_THEME.card,
    startsAt: toLocalInput(t.startsAt),
    endsAt: toLocalInput(t.endsAt),
    featured: t.featured,
    sortWeight: String(t.sortWeight ?? 0),
  };
}

function buildSource(f: Form): TrendSource {
  switch (f.sourceKind) {
    case "list":
      return { kind: "list", gameIds: f.listGames.map((g) => g.id) };
    case "filter": {
      const yf = parseInt(f.yearFrom, 10);
      const yt = parseInt(f.yearTo, 10);
      return {
        kind: "filter",
        ...(f.parentPlatform ? { parentPlatform: f.parentPlatform } : {}),
        ...(f.genre ? { genre: f.genre } : {}),
        ...(Number.isInteger(yf) ? { yearFrom: yf } : {}),
        ...(Number.isInteger(yt) ? { yearTo: yt } : {}),
        ...(f.query.trim() ? { query: f.query.trim() } : {}),
      };
    }
    default:
      return { kind: f.sourceKind };
  }
}

function buildSteps(f: Form): TrendStep[] {
  const steps: TrendStep[] = [
    {
      kind: "pickGames",
      min: parseInt(f.pickMin, 10),
      max: parseInt(f.pickMax, 10),
    },
  ];
  if (f.rank) steps.push({ kind: "rank" });
  if (f.reason)
    steps.push({
      kind: "reason",
      per: "pick",
      maxLen: parseInt(f.reasonMax, 10),
      required: false,
    });
  return steps;
}

/** The API answers validation with "field: CODE"; say it in words. */
const CODES: Record<string, string> = {
  PICK_RANGE: "pick between 1 and 9 games, min not above max",
  REASON_LEN: "a reason can be 10 to 280 characters",
  SOURCE_FILTER: "choose at least one filter (and years in order)",
  SOURCE_LIST: "add 1 to 300 games to the list",
  STEPS_COUNT: "add at least one step",
};
const friendly = (msg: string) =>
  msg.replace(/\b[A-Z][A-Z_]{3,}\b/g, (c) => CODES[c] ?? c);

export default function TrendEditor({
  id,
  onBack,
  onSaved,
  onStats,
}: {
  id: string | null;
  onBack: () => void;
  onSaved: (id: string) => void;
  onStats: (id: string) => void;
}) {
  const [trend, setTrend] = useState<AdminTrend | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<GameTaxonomy | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async (trendId: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await getTrend(trendId);
      setTrend(r.trend);
      setForm(formFrom(r.trend, r.listGames, r.cardGames ?? []));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => {
    getGameTaxonomy()
      .then(setTaxonomy)
      .catch(() => setTaxonomy(null));
  }, []);

  const locked = (trend?.entryCount ?? 0) > 0;
  const stepsEditable = !trend || isEditableSteps(trend.steps?.steps ?? []);

  function input(): TrendInput {
    return {
      slug: form.slug.trim(),
      hashtag: form.hashtag.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      steps: { v: 1, steps: buildSteps(form) },
      source: buildSource(form),
      theme: {
        ...(HEX.test(form.accent) ? { accent: form.accent } : {}),
        ...(HEX.test(form.background) ? { background: form.background } : {}),
        ...(HEX.test(form.card) ? { card: form.card } : {}),
        ...(form.cardGames.length
          ? { cardGames: form.cardGames.map((g) => g.id) }
          : {}),
      },
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      featured: form.featured,
      sortWeight: parseInt(form.sortWeight, 10) || 0,
    };
  }

  /** Create, or update with only what may still change. */
  async function save(): Promise<AdminTrend> {
    const body = input();
    if (!trend) return createTrend({ ...body, status: "draft" });
    const { steps, slug, hashtag, ...rest } = body;
    return updateTrend(trend.id, {
      ...rest,
      ...(locked ? {} : { slug, hashtag }),
      ...(locked || !stepsEditable ? {} : { steps }),
    });
  }

  async function run(
    label: string,
    fn: () => Promise<AdminTrend>,
    done: string,
  ) {
    setSaving(label);
    setError(null);
    setNotice(null);
    try {
      const saved = await fn();
      setNotice(done);
      if (!trend) onSaved(saved.id);
      else await load(saved.id);
    } catch (e) {
      setError(friendly((e as Error).message));
    } finally {
      setSaving(null);
    }
  }

  const saveDraft = () => run("save", save, "Saved.");
  const goLive = () =>
    run(
      "live",
      async () => {
        if (!trend) return createTrend({ ...input(), status: "live" });
        const saved = await save();
        return saved.status === "live"
          ? saved
          : setTrendStatus(saved.id, "live");
      },
      "Live. It shows at nexzyapp.com/drops.",
    );
  const changeStatus = (status: TrendStatus, done: string) => {
    if (!trend) return;
    if (
      status === "removed" &&
      !window.confirm("Remove this trend? Its page and entries stop showing.")
    )
      return;
    void run(status, () => setTrendStatus(trend.id, status), done);
  };

  if (loading)
    return (
      <Flex justify="center" py={10}>
        <Spinner />
      </Flex>
    );

  const status = trend?.status ?? "draft";

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <HStack gap={3}>
          <Button size="sm" {...outlineBtn} onClick={onBack}>
            <FiArrowLeft /> Trends
          </Button>
          <Heading size="md" color="nexzy.white">
            {trend ? `#${trend.hashtagDisplay}` : "New trend"}
          </Heading>
          <StatusChip status={status} />
        </HStack>
        <HStack gap={2} wrap="wrap">
          {trend && (
            <Button size="sm" {...outlineBtn} onClick={() => onStats(trend.id)}>
              Stats
            </Button>
          )}
          {trend && status === "live" && (
            <Button
              size="sm"
              {...outlineBtn}
              loading={saving === "ended"}
              onClick={() =>
                changeStatus("ended", "Ended. The page stays; no new entries.")
              }
            >
              End trend
            </Button>
          )}
          {trend && status === "live" && (
            <Button
              size="sm"
              {...outlineBtn}
              loading={saving === "draft"}
              onClick={() => changeStatus("draft", "Back to draft.")}
            >
              Back to draft
            </Button>
          )}
          {trend && status !== "removed" && (
            <Button
              size="sm"
              variant="outline"
              color="red.300"
              borderColor="red.400/50"
              _hover={{ bg: "red.500/10" }}
              loading={saving === "removed"}
              onClick={() => changeStatus("removed", "Removed.")}
            >
              Remove
            </Button>
          )}
          <Button
            size="sm"
            {...outlineBtn}
            loading={saving === "save"}
            onClick={saveDraft}
          >
            {trend ? "Save" : "Save draft"}
          </Button>
          {status !== "live" && (
            <Button
              size="sm"
              {...primaryBtn}
              loading={saving === "live"}
              onClick={goLive}
            >
              Go live
            </Button>
          )}
        </HStack>
      </Flex>

      {error && (
        <Text color="red.300" mb={3} fontSize="sm">
          {error}
        </Text>
      )}
      {notice && (
        <Text color="green.300" mb={3} fontSize="sm">
          {notice}
        </Text>
      )}

      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", lg: "1.35fr 1fr" }}
        gap={5}
        alignItems="start"
      >
        <VStack align="stretch" gap={4}>
          <Section title="Basics">
            <VStack align="stretch" gap={3}>
              <Flex gap={3} wrap="wrap">
                <Box flex="1" minW="200px">
                  <FieldLabel>Hashtag</FieldLabel>
                  <Input
                    {...inputProps}
                    value={form.hashtag}
                    disabled={locked}
                    placeholder="#GameDNA"
                    maxLength={31}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({
                        ...f,
                        hashtag: v,
                        slug: f.slugTouched ? f.slug : slugFromHashtag(v),
                      }));
                    }}
                  />
                  <Hint>
                    Letters, numbers and _. Unique, any case.
                    {locked ? " Locked: people have joined." : ""}
                  </Hint>
                </Box>
                <Box flex="1" minW="200px">
                  <FieldLabel>Link: nexzyapp.com/drops/</FieldLabel>
                  <Input
                    {...inputProps}
                    value={form.slug}
                    disabled={locked}
                    placeholder="game-dna"
                    maxLength={60}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slug: e.target.value.toLowerCase(),
                        slugTouched: true,
                      }))
                    }
                  />
                  <Hint>Lowercase letters, numbers and dashes.</Hint>
                </Box>
              </Flex>
              <Box>
                <FieldLabel>Title</FieldLabel>
                <Input
                  {...inputProps}
                  value={form.title}
                  maxLength={80}
                  placeholder="The 9 games that made you"
                  onChange={(e) => set("title", e.target.value)}
                />
                <Hint>
                  {form.title.length}/80. On the image and the trend page.
                </Hint>
              </Box>
              <Box>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  {...inputProps}
                  rows={2}
                  value={form.description}
                  maxLength={240}
                  onChange={(e) => set("description", e.target.value)}
                />
                <Hint>Optional. Trend page and website.</Hint>
              </Box>
            </VStack>
          </Section>

          <Section
            title="What people do"
            sub="The simplest trend is a title plus picking games."
          >
            {!stepsEditable ? (
              <Text fontSize="sm" color="whiteAlpha.700">
                This trend uses steps the editor doesn&apos;t change (
                {(trend?.steps?.steps ?? []).map((s) => s.kind).join(", ")}).
                They are kept as they are.
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                <Flex gap={3} align="flex-end" wrap="wrap">
                  <Box w="90px">
                    <FieldLabel>Pick at least</FieldLabel>
                    <Input
                      {...inputProps}
                      type="number"
                      min={1}
                      max={9}
                      value={form.pickMin}
                      disabled={locked}
                      onChange={(e) => set("pickMin", e.target.value)}
                    />
                  </Box>
                  <Box w="90px">
                    <FieldLabel>At most</FieldLabel>
                    <Input
                      {...inputProps}
                      type="number"
                      min={1}
                      max={9}
                      value={form.pickMax}
                      disabled={locked}
                      onChange={(e) => set("pickMax", e.target.value)}
                    />
                  </Box>
                  <Text fontSize="xs" color="whiteAlpha.600" pb={2}>
                    games, up to 9
                  </Text>
                </Flex>
                <Toggle
                  label="Rank them"
                  hint="People put their picks in order; the image shows 1, 2, 3."
                  on={form.rank}
                  disabled={locked}
                  onChange={(v) => set("rank", v)}
                />
                <Toggle
                  label="A reason per game"
                  hint="Short text for each pick, checked by moderation."
                  on={form.reason}
                  disabled={locked}
                  onChange={(v) => set("reason", v)}
                />
                {form.reason && (
                  <Box w="140px">
                    <FieldLabel>Reason length</FieldLabel>
                    <Input
                      {...inputProps}
                      type="number"
                      min={10}
                      max={280}
                      value={form.reasonMax}
                      disabled={locked}
                      onChange={(e) => set("reasonMax", e.target.value)}
                    />
                  </Box>
                )}
              </VStack>
            )}
            <Hint>
              Steps lock once the first person joins, so every entry stays
              comparable.
            </Hint>
          </Section>

          <Section title="Which games they can pick">
            <VStack align="stretch" gap={3}>
              <Segmented<SourceKind>
                options={[
                  ["any", "Any game"],
                  ["filter", "Filter"],
                  ["library", "Their library"],
                  ["wishlist", "Their wishlist"],
                  ["list", "A list I choose"],
                ]}
                value={form.sourceKind}
                onChange={(v) => set("sourceKind", v)}
              />
              {form.sourceKind === "filter" && (
                <FilterFields form={form} set={set} taxonomy={taxonomy} />
              )}
              {form.sourceKind === "list" && (
                <ListPicker
                  games={form.listGames}
                  onChange={(g) => set("listGames", g)}
                />
              )}
              <Hint>
                Hidden (mature) games never show, whatever the choice.
              </Hint>
            </VStack>
          </Section>

          <Section
            title="Card games"
            sub="Up to 3 games on this drop's card at nexzyapp.com/drops until people have picked. Then the most picked games take over."
          >
            <ListPicker
              games={form.cardGames}
              max={MAX_CARD_GAMES}
              onChange={(g) => set("cardGames", g)}
            />
          </Section>

          <Section title="Look" sub="Colors of the share image.">
            <Flex gap={5} wrap="wrap">
              {(
                [
                  ["accent", "Accent"],
                  ["background", "Background"],
                  ["card", "Tiles"],
                ] as const
              ).map(([k, label]) => (
                <HStack key={k} gap={2}>
                  <input
                    type="color"
                    aria-label={`${label} color`}
                    value={HEX.test(form[k]) ? form[k] : DEFAULT_THEME[k]}
                    onChange={(e) => set(k, e.target.value.toUpperCase())}
                    style={{
                      width: 34,
                      height: 34,
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 8,
                      background: "transparent",
                      padding: 0,
                    }}
                  />
                  <Box>
                    <Text fontSize="xs" fontWeight="600" color="nexzy.white">
                      {label}
                    </Text>
                    <Input
                      {...inputProps}
                      size="xs"
                      w="92px"
                      value={form[k]}
                      maxLength={7}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  </Box>
                </HStack>
              ))}
              <Button
                size="xs"
                {...outlineBtn}
                alignSelf="flex-end"
                onClick={() => setForm((f) => ({ ...f, ...DEFAULT_THEME }))}
              >
                Reset
              </Button>
            </Flex>
          </Section>

          <Section title="Publishing">
            <VStack align="stretch" gap={3}>
              <Flex gap={3} wrap="wrap">
                <Box flex="1" minW="200px">
                  <FieldLabel>Starts</FieldLabel>
                  <Input
                    {...inputProps}
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => set("startsAt", e.target.value)}
                  />
                  <Hint>Empty = as soon as it is live.</Hint>
                </Box>
                <Box flex="1" minW="200px">
                  <FieldLabel>Ends</FieldLabel>
                  <Input
                    {...inputProps}
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                  />
                  <Hint>Empty = never. An ended trend keeps its page.</Hint>
                </Box>
              </Flex>
              <Toggle
                label="Feature on Discover"
                hint="Shows first in the Trends row."
                on={form.featured}
                onChange={(v) => set("featured", v)}
              />
              <Box w="120px">
                <FieldLabel>Order</FieldLabel>
                <Input
                  {...inputProps}
                  type="number"
                  value={form.sortWeight}
                  onChange={(e) => set("sortWeight", e.target.value)}
                />
                <Hint>Higher shows first.</Hint>
              </Box>
            </VStack>
          </Section>
        </VStack>

        <Box position={{ base: "static", lg: "sticky" }} top="80px">
          <Preview form={form} />
        </Box>
      </Box>
    </Box>
  );
}

function FilterFields({
  form,
  set,
  taxonomy,
}: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  taxonomy: GameTaxonomy | null;
}) {
  const parents = useMemo(
    () =>
      (taxonomy?.platforms ?? [])
        .map((p) => p.parent)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [taxonomy],
  );
  const genres = useMemo(
    () =>
      [...(taxonomy?.genres ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [taxonomy],
  );
  return (
    <VStack align="stretch" gap={3}>
      <Flex gap={3} wrap="wrap">
        <Box flex="1" minW="150px">
          <FieldLabel>Platform</FieldLabel>
          <select
            value={form.parentPlatform}
            onChange={(e) => set("parentPlatform", e.target.value)}
            style={nativeControl}
          >
            <option value="" style={{ color: "#000" }}>
              Any
            </option>
            {parents.map((p) => (
              <option key={p.slug} value={p.slug} style={{ color: "#000" }}>
                {p.name}
              </option>
            ))}
          </select>
        </Box>
        <Box flex="1" minW="150px">
          <FieldLabel>Genre</FieldLabel>
          <select
            value={form.genre}
            onChange={(e) => set("genre", e.target.value)}
            style={nativeControl}
          >
            <option value="" style={{ color: "#000" }}>
              Any
            </option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug} style={{ color: "#000" }}>
                {g.name}
              </option>
            ))}
          </select>
        </Box>
        <Box w="110px">
          <FieldLabel>Released from</FieldLabel>
          <Input
            {...inputProps}
            type="number"
            min={1950}
            max={2100}
            value={form.yearFrom}
            onChange={(e) => set("yearFrom", e.target.value)}
          />
        </Box>
        <Box w="110px">
          <FieldLabel>Released to</FieldLabel>
          <Input
            {...inputProps}
            type="number"
            min={1950}
            max={2100}
            value={form.yearTo}
            onChange={(e) => set("yearTo", e.target.value)}
          />
        </Box>
      </Flex>
      <Box>
        <FieldLabel>Name contains</FieldLabel>
        <Input
          {...inputProps}
          value={form.query}
          maxLength={60}
          placeholder="e.g. zelda (aliases count)"
          onChange={(e) => set("query", e.target.value)}
        />
      </Box>
    </VStack>
  );
}

function ListPicker({
  games,
  onChange,
  max = MAX_LIST,
}: {
  games: TrendGameLite[];
  onChange: (g: TrendGameLite[]) => void;
  max?: number;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GameLite[]>([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await searchGamesForLink(term);
        if (seq.current === mine) setHits(r.slice(0, 10));
      } catch {
        if (seq.current === mine) setHits([]);
      } finally {
        if (seq.current === mine) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const chosen = new Set(games.map((g) => g.id));
  const add = (g: GameLite) => {
    if (chosen.has(g.id) || games.length >= max) return;
    onChange([
      ...games,
      { id: g.id, name: g.name, backgroundImage: g.backgroundImage },
    ]);
  };

  return (
    <VStack align="stretch" gap={2}>
      <HStack>
        <Input
          {...inputProps}
          value={q}
          placeholder="Search a game to add"
          onChange={(e) => setQ(e.target.value)}
        />
        {busy && <Spinner size="sm" />}
      </HStack>
      {hits.length > 0 && (
        <VStack
          align="stretch"
          gap={0}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="md"
          maxH="240px"
          overflowY="auto"
        >
          {hits.map((g) => (
            <Flex
              key={g.id}
              align="center"
              justify="space-between"
              px={3}
              py={1.5}
              borderTopWidth="1px"
              borderColor="whiteAlpha.100"
            >
              <Text fontSize="sm" color="nexzy.white" lineClamp={1}>
                {g.name}
                {g.released ? ` (${g.released.slice(0, 4)})` : ""}
              </Text>
              <Button
                size="xs"
                {...outlineBtn}
                disabled={chosen.has(g.id)}
                onClick={() => add(g)}
              >
                {chosen.has(g.id) ? "Added" : "Add"}
              </Button>
            </Flex>
          ))}
        </VStack>
      )}
      <Text fontSize="xs" color="whiteAlpha.700">
        {games.length} of {max} games
      </Text>
      <Flex gap={2} wrap="wrap">
        {games.map((g) => (
          <HStack
            key={g.id}
            gap={1}
            pl={2.5}
            pr={1}
            py={0.5}
            borderRadius="full"
            bg="whiteAlpha.200"
          >
            <Text fontSize="xs" color="nexzy.white">
              {g.name}
            </Text>
            <Button
              size="2xs"
              variant="ghost"
              color="nexzy.gray.100"
              aria-label={`Remove ${g.name}`}
              onClick={() => onChange(games.filter((x) => x.id !== g.id))}
            >
              <FiX />
            </Button>
          </HStack>
        ))}
      </Flex>
    </VStack>
  );
}

/** The server's render with sample games. Debounced; the previous request
 *  is cancelled when a new one starts. */
function Preview({ form }: { form: Form }) {
  const [shape, setShape] = useState<TrendShape>("portrait");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const count = Math.min(Math.max(parseInt(form.pickMax, 10) || 9, 1), 9);
  const body = useMemo(
    () => ({
      shape,
      hashtag: form.hashtag.trim() || "YourTrend",
      title: form.title.trim() || "Your trend title",
      slug: form.slug.trim() || "your-trend",
      theme: {
        ...(HEX.test(form.accent) ? { accent: form.accent } : {}),
        ...(HEX.test(form.background) ? { background: form.background } : {}),
        ...(HEX.test(form.card) ? { card: form.card } : {}),
      },
      count,
      ranked: form.rank,
    }),
    [
      shape,
      form.hashtag,
      form.title,
      form.slug,
      form.accent,
      form.background,
      form.card,
      count,
      form.rank,
    ],
  );
  const key = JSON.stringify(body);

  useEffect(() => {
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setBusy(true);
      setErr(null);
      try {
        const r = await previewTrend(JSON.parse(key), ac.signal);
        setImage(r.image);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr((e as Error).message);
      } finally {
        if (abort.current === ac) setBusy(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => () => abort.current?.abort(), []);

  const ratio =
    shape === "tall" ? "9 / 16" : shape === "link" ? "1200 / 630" : "4 / 5";
  return (
    <VStack align="stretch" gap={3}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <HStack gap={2}>
          <Text fontWeight="800" color="nexzy.white">
            Live preview
          </Text>
          {busy && <Spinner size="xs" />}
        </HStack>
        <Segmented<TrendShape>
          options={[
            ["portrait", "4:5"],
            ["tall", "9:16"],
            ["link", "Link"],
          ]}
          value={shape}
          onChange={setShape}
        />
      </Flex>
      <Box
        w="100%"
        maxW={shape === "tall" ? "340px" : "100%"}
        mx="auto"
        style={{ aspectRatio: ratio }}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        overflow="hidden"
        bg="whiteAlpha.50"
      >
        {image && (
          <Image
            src={image}
            alt="Share image preview"
            w="100%"
            h="100%"
            objectFit="contain"
          />
        )}
      </Box>
      {err ? (
        <Text fontSize="xs" color="red.300">
          {err}
        </Text>
      ) : (
        <Hint>
          The server&apos;s real render with sample games. Updates as you type.
        </Hint>
      )}
    </VStack>
  );
}
