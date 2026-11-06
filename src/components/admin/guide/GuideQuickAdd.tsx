"use client";

// Admin -> Hub guides -> Quick add: the launch-day screen. One form for a new
// find: what it is, a few words, photos (pick, drop or paste), the type's own
// fields (a video link goes in the type's video field), and a click on the
// map. One Save writes the entry and its pins together. Defaults to
// Unconfirmed so it is public at once with the unconfirmed label; "Add
// another" keeps the type, era and spoiler stage for the next find.
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiExternalLink, FiImage } from "react-icons/fi";
import type { HubImage, HubTemplateConfig } from "@/lib/hub-engine/types";
import {
  ENTRY_STATUSES,
  createEngineEntry,
  errorLines,
  fileToDataUrl,
  uploadEngineImage,
  type EngineEntry,
  type EntryInput,
  type EntryStatus,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Card,
  Check,
  Gold,
  Labeled,
  LongIn,
  Pick,
  Plain,
  Problems,
  TextIn,
} from "@/components/admin/guide/ui";
import { FieldInput } from "@/components/admin/guide/GuideEntriesEditor";
import PinPicker, { type PickedPin } from "@/components/admin/guide/PinPicker";

const MAX_PHOTOS = 12;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];

export default function GuideQuickAdd({
  gameId,
  gameSlug,
  config,
}: {
  gameId: string;
  gameSlug: string;
  config: HubTemplateConfig;
}) {
  // Pinnable types first: launch-day finds are places on the map.
  const types = useMemo(
    () =>
      [...config.types].sort(
        (a, b) => Number(b.pinnable) - Number(a.pinnable),
      ),
    [config.types],
  );
  const [typeKey, setTypeKey] = useState(types[0]?.key ?? "");
  const type = config.types.find((t) => t.key === typeKey);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [refs, setRefs] = useState<
    { id: string; slug: string; title: string; type: string }[]
  >([]);
  const [media, setMedia] = useState<HubImage[]>([]);
  const [status, setStatus] = useState<EntryStatus>("unconfirmed");
  const [stage, setStage] = useState("");
  const [eras, setEras] = useState<string[]>([]);
  const [pins, setPins] = useState<PickedPin[]>([]);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [saved, setSaved] = useState<EngineEntry | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const formRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  // Field values of the old type don't carry over to a new type.
  useEffect(() => {
    setFields({});
    setRefs([]);
    if (!type?.pinnable) setPins([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey]);

  const addFiles = async (files: File[]) => {
    const list = files
      .filter((f) => PHOTO_TYPES.includes(f.type))
      .slice(0, MAX_PHOTOS - mediaRef.current.length);
    if (!list.length) return;
    setErr([]);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const r = await uploadEngineImage(
          gameId,
          await fileToDataUrl(file),
          "photo",
        );
        setMedia((cur) =>
          cur.length < MAX_PHOTOS ? [...cur, { url: r.url, alt: null }] : cur,
        );
      } catch (e) {
        setErr(errorLines(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  // Paste a screenshot anywhere on the form.
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const reset = (keepContext: boolean) => {
    setTitle("");
    setSummary("");
    setFields({});
    setRefs([]);
    setMedia([]);
    setPins([]);
    setErr([]);
    if (!keepContext) {
      setStage("");
      setEras([]);
      setStatus("unconfirmed");
    }
  };

  const save = async () => {
    if (!type) return;
    if (!title.trim()) return setErr(["Give it a name."]);
    if (uploading) return setErr(["Wait for the photos to finish uploading."]);
    setBusy(true);
    setErr([]);
    try {
      const input: EntryInput = {
        typeKey: type.key,
        title: title.trim(),
        summary: summary.trim() || null,
        status,
        spoilerStage: stage || null,
        eras,
        fields,
        media,
        ...(type.pinnable ? { pins } : {}),
      };
      const r = await createEngineEntry(gameId, input);
      setSaved(r);
      setSavedCount((n) => n + 1);
      reset(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };

  if (!types.length)
    return (
      <Text color={C.warn}>
        Add entry types on the Setup tab and publish first.
      </Text>
    );
  const isPublic = (s: EntryStatus) => s === "unconfirmed" || s === "confirmed";
  return (
    <Stack gap={4} ref={formRef}>
      {saved && (
        <Card>
          <Flex gap={3} align="center" wrap="wrap">
            <Text color={C.good} fontWeight="700" flex="1">
              Saved "{saved.title}"
              {saved.pins.length ? ` with ${saved.pins.length} pin(s)` : ""}.
              {isPublic(saved.status)
                ? " It shows on the site within a minute."
                : " It is a draft (admins only)."}
            </Text>
            {isPublic(saved.status) && (
              <a
                href={`/games/${gameSlug}/map`}
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
                Open the map <FiExternalLink aria-hidden />
              </a>
            )}
            <Text fontSize="xs" color={C.faint}>
              {savedCount} added this session
            </Text>
          </Flex>
        </Card>
      )}

      <Card title="New find">
        <Stack gap={4}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Labeled label="What is it">
              <Pick
                label="What is it"
                value={typeKey}
                onChange={setTypeKey}
                options={types.map((t) => ({
                  value: t.key,
                  label: t.pinnable ? t.label : `${t.label} (no map)`,
                }))}
              />
            </Labeled>
            <Labeled label="Name *">
              <TextIn
                value={title}
                maxLength={120}
                placeholder="e.g. Hidden stash under the pier"
                onChange={setTitle}
              />
            </Labeled>
            <Labeled label="Status">
              <Pick
                label="Status"
                value={status}
                onChange={(v) => setStatus(v as EntryStatus)}
                options={ENTRY_STATUSES.map((s) => ({
                  value: s.key,
                  label: `${s.label}: ${s.hint}`,
                }))}
              />
            </Labeled>
          </SimpleGrid>

          <Labeled label="Short description" hint="Shows on cards and the map popup (max 300).">
            <LongIn
              rows={2}
              maxLength={300}
              value={summary}
              onChange={setSummary}
            />
          </Labeled>

          <Box
            border="1px dashed"
            borderColor={C.line}
            borderRadius="10px"
            p={3}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void addFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <Flex gap={2} wrap="wrap" mb={media.length ? 2 : 0}>
              {media.map((m, i) => (
                <Box key={m.url} w="140px" bg={C.raised} borderRadius="8px" p={2}>
                  <img
                    src={m.url}
                    alt=""
                    style={{
                      width: "100%",
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                  <TextIn
                    value={m.alt ?? ""}
                    placeholder="Describe it"
                    maxLength={160}
                    onChange={(a) =>
                      setMedia((cur) =>
                        cur.map((x, j) => (j === i ? { ...x, alt: a || null } : x)),
                      )
                    }
                  />
                  <Plain
                    danger
                    onClick={() =>
                      setMedia((cur) => cur.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </Plain>
                </Box>
              ))}
            </Flex>
            <Flex gap={2} align="center" color={C.muted} fontSize="sm">
              <FiImage aria-hidden />
              <Text>
                {uploading
                  ? `Uploading ${uploading} photo(s)...`
                  : "Drop photos here, paste a screenshot (Cmd+V), or "}
              </Text>
              {!uploading && media.length < MAX_PHOTOS && (
                <label
                  style={{
                    color: C.text,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  pick files
                  <input
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    multiple
                    hidden
                    onChange={(e) => {
                      if (e.target.files) void addFiles(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </Flex>
            <Text fontSize="xs" color={C.faint} mt={1}>
              The first photo is the card and map photo.
            </Text>
          </Box>

          {type && type.fields.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {type.fields.map((f) => (
                <Box
                  key={f.key}
                  gridColumn={
                    f.kind === "longtext" || f.kind === "gallery"
                      ? { md: "span 2" }
                      : undefined
                  }
                >
                  <FieldInput
                    gameId={gameId}
                    config={config}
                    field={f}
                    value={fields[f.key]}
                    refs={refs}
                    onRefs={setRefs}
                    onChange={(val) =>
                      setFields((cur) => {
                        const next = { ...cur };
                        if (val === undefined) delete next[f.key];
                        else next[f.key] = val;
                        return next;
                      })
                    }
                  />
                </Box>
              ))}
            </SimpleGrid>
          )}
          {type && !type.fields.some((f) => f.kind === "video") && (
            <Text fontSize="xs" color={C.faint}>
              To attach a video here, add a Video field to {type.plural} on the
              Setup tab (or use a guide page video block).
            </Text>
          )}

          {(config.spoilerStages.length > 0 || config.eras.length > 0) && (
            <Flex gap={4} wrap="wrap" align="flex-end">
              {config.spoilerStages.length > 0 && (
                <Box w="260px">
                  <Labeled label="Spoiler stage">
                    <Pick
                      label="Spoiler stage"
                      value={stage}
                      onChange={setStage}
                      options={[
                        { value: "", label: "Not a spoiler" },
                        ...config.spoilerStages.map((s) => ({
                          value: s.key,
                          label: s.label,
                        })),
                      ]}
                    />
                  </Labeled>
                </Box>
              )}
              {config.eras.length > 0 && (
                <Flex gap={4} wrap="wrap">
                  {config.eras.map((x) => (
                    <Check
                      key={x.key}
                      label={x.label}
                      checked={eras.includes(x.key)}
                      onChange={(on) =>
                        setEras((cur) =>
                          on ? [...cur, x.key] : cur.filter((k) => k !== x.key),
                        )
                      }
                    />
                  ))}
                </Flex>
              )}
            </Flex>
          )}
        </Stack>
      </Card>

      {type?.pinnable && (
        <Card title="Where is it">
          <PinPicker
            gameId={gameId}
            config={config}
            pins={pins}
            color={type.color}
            onChange={setPins}
            refreshKey={savedCount}
          />
        </Card>
      )}

      <Problems lines={err} />
      <Flex gap={2} justify="flex-end" wrap="wrap">
        <Plain onClick={() => reset(false)}>Clear</Plain>
        <Gold onClick={() => void save()} loading={busy}>
          Save find
        </Gold>
      </Flex>
    </Stack>
  );
}
