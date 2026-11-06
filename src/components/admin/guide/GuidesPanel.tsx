"use client";

// Admin -> Guides (Phase 4 mega hub engine). One place to build a game's
// guide: Setup (the template: types, fields, maps, checklists, sections),
// Entries, Map (place pins) and Import / Export. Template changes stay in a
// draft until Publish; the guide shows on the site only when switched Live.
// A "How this works" legend sits on top so nobody has to remember the terms.
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiExternalLink } from "react-icons/fi";
import { listGameProfiles, type GameProfileRow } from "@/lib/admin/client";
import {
  discardEngineDraft,
  errorLines,
  getEngineTemplate,
  publishEngine,
  restoreEngineVersion,
  saveEngineDraft,
  setEngineEnabled,
  type EngineTemplate,
} from "@/lib/admin/client-hub-engine";
import type { HubTemplateConfig } from "@/lib/hub-engine/types";
import {
  C,
  Card,
  Gold,
  Pick,
  Plain,
  Problems,
} from "@/components/admin/guide/ui";
import { EMPTY_TEMPLATE } from "@/components/admin/guide/presets";
import GuideTemplateEditor from "@/components/admin/guide/GuideTemplateEditor";
import GuideEntriesEditor from "@/components/admin/guide/GuideEntriesEditor";
import GuideMapEditor from "@/components/admin/guide/GuideMapEditor";
import GuideImport from "@/components/admin/guide/GuideImport";
import GuideQuickAdd from "@/components/admin/guide/GuideQuickAdd";
import GuidePagesEditor from "@/components/admin/guide/GuidePagesEditor";

type View = "setup" | "quick" | "entries" | "pages" | "map" | "import";
const VIEWS: { key: View; label: string }[] = [
  { key: "quick", label: "Quick add" },
  { key: "entries", label: "Entries" },
  { key: "pages", label: "Pages" },
  { key: "map", label: "Map" },
  { key: "setup", label: "Setup" },
  { key: "import", label: "Import / Export" },
];
const LEGEND_KEY = "nexzy-admin-guides-legend";

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " CT"
    : "never";

function Legend() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LEGEND_KEY) === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(LEGEND_KEY, o ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };
  const rows: [string, string][] = [
    [
      "Template",
      "The game's guide setup: entry types, their fields, maps, checklists, hub sections and switches. Edits are a draft until you Publish.",
    ],
    [
      "Entry type",
      "A kind of thing in the game (Location, Gold Skulltula, Mission...). Its fields decide the form you fill and what readers see.",
    ],
    [
      "Entry",
      "One thing: a title, its field values, photos, a status and a spoiler stage. Entries can link to each other.",
    ],
    [
      "Status",
      "Draft = admins only. Unconfirmed = public with the unconfirmed label. Confirmed = public. Hidden = taken down, kept.",
    ],
    [
      "Pin",
      "An entry's spot on a map (pixels on our map art). One entry can have pins on several maps.",
    ],
    [
      "Quick add",
      "The launch-day screen: name, photos (drop or paste), the type's fields, a click on the map, Save. Entry and pin go in together, Unconfirmed by default.",
    ],
    [
      "Checklist",
      "A filter readers tick off (for example all Gold Skulltulas). Ticks are free; guests keep them in the browser. Turn on Story walkthrough for the main story list: its items become steps (Step X of N, Previous / Next).",
    ],
    [
      "Guide page",
      "A page of the guide built from blocks (text, photo, gallery, video, table, dropdown, tip, map, checklist, entry list). Pages form the table of contents; a page can sit under another (walkthrough chapters).",
    ],
    [
      "Hub section",
      "A block on the game's hub page: map, cards, list, checklist or featured entry, in your order.",
    ],
    [
      "Spoiler stage / Era",
      "Readers pick how far they are and which era; later stages and other eras hide.",
    ],
    [
      "Publish",
      "Makes the draft template live. Refused if it would break content (a type still used, pins off a smaller map). Every publish is kept in History.",
    ],
    [
      "Live",
      "Shows the guide on the website and app. Off = nobody sees it, even if published.",
    ],
  ];
  return (
    <Box
      bg={C.surface}
      border="1px solid"
      borderColor={C.line}
      borderRadius="12px"
    >
      <Flex
        as="button"
        w="100%"
        p={3}
        align="center"
        gap={2}
        onClick={toggle}
        aria-expanded={open}
      >
        {open ? <FiChevronDown /> : <FiChevronRight />}
        <Text color={C.text} fontWeight="700">
          How this works
        </Text>
      </Flex>
      {open && (
        <Stack gap={2} px={4} pb={4}>
          {rows.map(([k, v]) => (
            <Flex key={k} gap={3} fontSize="sm">
              <Text color={C.gold} fontWeight="700" minW="140px">
                {k}
              </Text>
              <Text color={C.muted}>{v}</Text>
            </Flex>
          ))}
          <Text fontSize="sm" color={C.muted}>
            Typical flow: Setup (start from a preset, upload map art) &gt; Save
            draft &gt; Publish &gt; add finds with Quick add (or Entries + Map)
            &gt; build Pages &gt; switch Live.
          </Text>
        </Stack>
      )}
    </Box>
  );
}

export default function GuidesPanel() {
  const [games, setGames] = useState<GameProfileRow[]>([]);
  const [gameId, setGameId] = useState("");
  const [tpl, setTpl] = useState<EngineTemplate | null>(null);
  const [draft, setDraft] = useState<HubTemplateConfig>(EMPTY_TEMPLATE);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<View>("setup");
  const [mapEntry, setMapEntry] = useState<string | null>(null);
  const [mapDirty, setMapDirty] = useState(false);
  const [pageDirty, setPageDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    listGameProfiles()
      .then((rows) => {
        setGames(rows);
        if (rows.length === 1) setGameId(rows[0].gameId);
      })
      .catch((e) => setErr(errorLines(e)));
  }, []);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setErr([]);
    try {
      const t = await getEngineTemplate(id);
      setTpl(t);
      setDraft(t.draft);
      setDirty(false);
      // A published guide opens on Quick add (launch-day work); a new one
      // on Setup.
      setView(t.version > 0 ? "quick" : "setup");
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gameId) void load(gameId);
  }, [gameId, load]);

  const act = async (fn: () => Promise<EngineTemplate>, done: string) => {
    setBusy(true);
    setErr([]);
    setNote("");
    try {
      const t = await fn();
      setTpl(t);
      setDraft(t.draft);
      setDirty(false);
      setNote(done);
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };

  // Entries and pins are checked against the saved draft (or the published
  // template when there is no draft), the same rule the API uses.
  const config = tpl?.draft;

  return (
    <Stack gap={4}>
      <Legend />
      <Flex gap={3} align="center" wrap="wrap">
        <Box w="300px">
          <Pick
            label="Game"
            value={gameId}
            onChange={(v) => {
              if (
                (dirty || mapDirty || pageDirty) &&
                !window.confirm("You have unsaved changes. Switch game anyway?")
              )
                return;
              setGameId(v);
            }}
            options={[
              { value: "", label: "Pick a mega hub game" },
              ...games.map((g) => ({ value: g.gameId, label: g.name })),
            ]}
          />
        </Box>
        {tpl && (
          <>
            <Badge
              bg="transparent"
              border="1px solid"
              borderColor={tpl.enabled ? C.good : C.faint}
              color={tpl.enabled ? C.good : C.faint}
            >
              {tpl.enabled ? "Live" : "Off"}
            </Badge>
            <Text fontSize="sm" color={C.muted}>
              v{tpl.version} published {fmt(tpl.publishedAt)}
              {tpl.hasDraft ? " · unpublished draft" : ""}
            </Text>
            <a
              href={`/games/${tpl.game.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.gold,
                fontSize: 13,
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              View hub <FiExternalLink aria-hidden />
            </a>
          </>
        )}
      </Flex>
      {!games.length && (
        <Text color={C.faint} fontSize="sm">
          Guides are for mega hub games. Add one in Mega hubs first.
        </Text>
      )}
      {loading && <Spinner color={C.gold} />}
      <Problems lines={err} />
      {note && (
        <Text color={C.good} fontSize="sm">
          {note}
        </Text>
      )}

      {tpl && !loading && (
        <>
          <Card>
            <Flex gap={2} wrap="wrap" align="center">
              <Gold
                onClick={() =>
                  void act(
                    () => saveEngineDraft(tpl.game.id, draft),
                    "Draft saved.",
                  )
                }
                loading={busy}
                disabled={!dirty}
              >
                Save draft
              </Gold>
              <Gold
                onClick={() => {
                  if (dirty)
                    return setErr(["Save the draft first, then publish."]);
                  if (
                    window.confirm(
                      "Publish this template? Readers see the changes within a minute if the guide is Live.",
                    )
                  )
                    void act(() => publishEngine(tpl.game.id), "Published.");
                }}
                disabled={busy || !tpl.hasDraft}
              >
                Publish
              </Gold>
              {tpl.hasDraft && (
                <Plain
                  onClick={() =>
                    window.confirm("Throw away the unpublished draft?") &&
                    void act(
                      () => discardEngineDraft(tpl.game.id),
                      "Draft discarded.",
                    )
                  }
                >
                  Discard draft
                </Plain>
              )}
              <Box flex="1" />
              <Plain
                onClick={() =>
                  window.confirm(
                    tpl.enabled
                      ? "Hide this guide from the site and app?"
                      : "Show this guide on the site and app?",
                  ) &&
                  void act(
                    () => setEngineEnabled(tpl.game.id, !tpl.enabled),
                    tpl.enabled ? "Guide is off." : "Guide is live.",
                  )
                }
                disabled={busy || (!tpl.enabled && tpl.version < 1)}
              >
                {tpl.enabled ? "Switch off" : "Go live"}
              </Plain>
              {tpl.history.length > 0 && (
                <Box w="230px">
                  <Pick
                    label="History"
                    value=""
                    onChange={(v) => {
                      const n = Number(v);
                      if (
                        n &&
                        window.confirm(
                          `Load version ${n} into the draft? Publish to apply it.`,
                        )
                      )
                        void act(
                          () => restoreEngineVersion(tpl.game.id, n),
                          `Version ${n} loaded into the draft.`,
                        );
                    }}
                    options={[
                      { value: "", label: "History: restore a version" },
                      ...tpl.history.map((h) => ({
                        value: String(h.version),
                        label: `v${h.version} · ${fmt(h.at)} · ${h.publishedBy ?? ""}`,
                      })),
                    ]}
                  />
                </Box>
              )}
            </Flex>
            {dirty && (
              <Text mt={2} fontSize="sm" color={C.warn}>
                Unsaved changes on Setup.
              </Text>
            )}
          </Card>

          <HStack gap={2} wrap="wrap">
            {VIEWS.map(({ key: v, label }) => (
              <Box
                key={v}
                as="button"
                onClick={() => {
                  // Leaving a tab unmounts its editor; unsaved pin drags or
                  // page edits must not vanish without a word.
                  if (
                    view === "map" &&
                    v !== "map" &&
                    mapDirty &&
                    !window.confirm(
                      "You have unsaved pin changes on the Map tab. Leave anyway?",
                    )
                  )
                    return;
                  if (
                    view === "pages" &&
                    v !== "pages" &&
                    pageDirty &&
                    !window.confirm(
                      "You have unsaved page changes. Leave anyway?",
                    )
                  )
                    return;
                  setView(v);
                }}
                px={4}
                py={2}
                borderRadius="999px"
                fontWeight="700"
                fontSize="sm"
                bg={view === v ? C.gold : C.surface}
                color={view === v ? C.ink : C.text}
                border="1px solid"
                borderColor={view === v ? C.gold : C.line}
              >
                {label}
              </Box>
            ))}
          </HStack>

          {view === "setup" && (
            <GuideTemplateEditor
              gameId={tpl.game.id}
              draft={draft}
              onChange={(c) => {
                setDraft(c);
                setDirty(true);
              }}
            />
          )}
          {view !== "setup" && dirty && (
            <Text color={C.warn} fontSize="sm">
              Setup has unsaved changes. Entries and pins use the last saved
              draft.
            </Text>
          )}
          {view === "quick" && config && (
            <GuideQuickAdd
              gameId={tpl.game.id}
              gameSlug={tpl.game.slug}
              config={config}
            />
          )}
          {view === "pages" && config && (
            <GuidePagesEditor
              gameId={tpl.game.id}
              gameSlug={tpl.game.slug}
              config={config}
              onDirtyChange={setPageDirty}
            />
          )}
          {view === "entries" && config && (
            <GuideEntriesEditor
              gameId={tpl.game.id}
              config={config}
              onOpenOnMap={(id) => {
                setMapEntry(id);
                setView("map");
              }}
            />
          )}
          {view === "map" && config && (
            <GuideMapEditor
              gameId={tpl.game.id}
              config={config}
              initialEntryId={mapEntry}
              onDirtyChange={setMapDirty}
            />
          )}
          {view === "import" && config && (
            <GuideImport
              gameId={tpl.game.id}
              gameSlug={tpl.game.slug}
              config={config}
            />
          )}
        </>
      )}
    </Stack>
  );
}
