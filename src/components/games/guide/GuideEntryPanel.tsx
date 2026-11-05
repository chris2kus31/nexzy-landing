"use client";

// An entry's details opened ON the map (side panel on desktop, a sheet under
// the map on phones), so reading about a pin never leaves the map:
// photo first, a one-line summary of the short facts, the longer fields,
// then what links here with found progress and "Show on map". Links to
// other entries inside the panel open in the panel too. The entry pages
// still exist for search engines; the map just doesn't send readers there.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import NextImage from "next/image";
import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiCheck, FiCircle, FiLink, FiMapPin, FiX } from "react-icons/fi";
import {
  entryPath,
  typeOf,
  type HubEntryFull,
  type HubFieldDef,
  type HubImage,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  FieldValue,
  G,
  hasFieldValue,
  TypeChip,
  UnconfirmedBadge,
} from "@/components/games/guide/GuideBits";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GREEN = "#7EE2A0";

// Entries already opened this visit (small; cleared on reload). Only
// successful loads are kept, so a failed fetch is retried next time.
const cache = new Map<string, HubEntryFull>();

type Props = {
  slug: string;
  config: HubTemplateConfig;
  entrySlug: string;
  /** Entry ids the reader has marked found. */
  found: ReadonlySet<string>;
  /** Entry ids that have a pin on the open map. */
  pinned: ReadonlySet<string>;
  onToggleFound: (entryId: string) => void;
  onOpenEntry: (entrySlug: string) => void;
  /** Light up these entries' pins on the map. */
  onShowOnMap: (entryIds: string[], label: string) => void;
  onClose: () => void;
};

/** Short facts that read well in one line ("When: Night · Needs: Bombs"). */
function shortFact(f: HubFieldDef, v: unknown): string | null {
  if (!hasFieldValue(f, v)) return null;
  switch (f.kind) {
    case "select":
      return f.options?.find((o) => o.key === v)?.label ?? null;
    case "number":
      return typeof v === "number" ? v.toLocaleString("en-US") : null;
    case "boolean":
      return v ? "Yes" : "No";
    case "text":
      return typeof v === "string" && v.length <= 40 ? v : null;
    default:
      return null;
  }
}

function isImage(v: unknown): v is HubImage {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as HubImage).url === "string" &&
    (v as HubImage).url.startsWith("https://")
  );
}

function IconBtn({
  label,
  onClick,
  children,
  overlay = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  overlay?: boolean;
}) {
  return (
    <Button
      size="xs"
      variant="ghost"
      color={G.text}
      bg={overlay ? "rgba(11,14,29,0.72)" : "transparent"}
      _hover={{ bg: overlay ? "rgba(11,14,29,0.9)" : "rgba(255,255,255,0.08)" }}
      borderRadius="999px"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export default function GuideEntryPanel({
  slug,
  config,
  entrySlug,
  found,
  pinned,
  onToggleFound,
  onOpenEntry,
  onShowOnMap,
  onClose,
}: Props) {
  const key = `${slug}/${entrySlug}`;
  const [entry, setEntry] = useState<HubEntryFull | null>(
    cache.get(key) ?? null,
  );
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const hit = cache.get(key);
    setFailed(false);
    setCopied(false);
    if (hit) {
      setEntry(hit);
      return;
    }
    setEntry(null);
    const ctl = new AbortController();
    fetch(`/api/hub-engine/${slug}/entries/${encodeURIComponent(entrySlug)}`, {
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: HubEntryFull) => {
        cache.set(key, d);
        setEntry(d);
      })
      .catch(() => {
        if (!ctl.signal.aborted) setFailed(true);
      });
    return () => ctl.abort();
  }, [key, slug, entrySlug]);

  // Keyboard users land on the details, not back at the top of the page.
  useEffect(() => {
    if (entry) titleRef.current?.focus({ preventScroll: true });
  }, [entry]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Links to other entries of this game (field links) open here instead of
  // navigating. New-tab clicks still go to the page.
  const keepOnMap = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const parts = url.pathname.split("/").filter(Boolean);
    // /games/<slug>/<type>/<entry>
    if (
      parts.length === 4 &&
      parts[0] === "games" &&
      parts[1] === slug &&
      typeOf(config, parts[2]) &&
      SLUG_RE.test(parts[3])
    ) {
      e.preventDefault();
      onOpenEntry(parts[3]);
    }
  };

  const t = entry ? typeOf(config, entry.type) : undefined;

  // The shared link: this map with the pin open when it has a pin here,
  // otherwise the entry's own page (when its type has one).
  const copyLink = async () => {
    if (!entry) return;
    const here = new URL(window.location.href);
    const url =
      here.searchParams.has("pin") || !t?.page
        ? here.toString()
        : new URL(entryPath(slug, entry.type, entry.slug), here).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: nothing to show */
    }
  };

  const hero = entry ? (entry.media[0] ?? entry.image) : null;
  const gallery = entry ? entry.media.filter((m) => m.url !== hero?.url) : [];
  const facts: Array<{ key: string; label: string; text: string }> = [];
  const longFields: HubFieldDef[] = [];
  for (const f of t?.fields ?? []) {
    const v = entry?.fields[f.key];
    const s = facts.length < 3 ? shortFact(f, v) : null;
    if (s) facts.push({ key: f.key, label: f.label, text: s });
    else if (entry && hasFieldValue(f, v)) longFields.push(f);
  }
  const eraLabels = (entry?.eras ?? [])
    .map((k) => config.eras.find((e) => e.key === k)?.label)
    .filter((l): l is string => !!l);
  const isFound = !!entry && found.has(entry.id);

  const actions = (overlay: boolean) => (
    <HStack gap={1}>
      {entry && (
        <IconBtn
          label={copied ? "Link copied" : "Copy link"}
          onClick={copyLink}
          overlay={overlay}
        >
          {copied ? <FiCheck color={GREEN} /> : <FiLink />}
        </IconBtn>
      )}
      <IconBtn label="Close details" onClick={onClose} overlay={overlay}>
        <FiX />
      </IconBtn>
    </HStack>
  );

  return (
    <Box
      role="dialog"
      aria-label={entry?.title ?? "Details"}
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="14px"
      boxShadow="0 12px 40px rgba(0,0,0,0.5)"
      overflow="hidden"
      onClickCapture={keepOnMap}
    >
      {hero && isImage(hero) ? (
        <Box position="relative" w="100%" h="200px" bg={G.card}>
          <NextImage
            src={hero.url}
            alt={hero.alt ?? entry?.title ?? ""}
            fill
            sizes="380px"
            style={{ objectFit: "cover" }}
          />
          <Box position="absolute" top={2} right={2}>
            {actions(true)}
          </Box>
        </Box>
      ) : (
        <Flex
          justify="space-between"
          align="center"
          px={4}
          pt={3}
          pb={2}
          borderBottom="1px solid"
          borderColor={G.line}
        >
          {entry ? <TypeChip config={config} type={entry.type} /> : <Box />}
          {actions(false)}
        </Flex>
      )}

      {!entry && !failed && (
        <Flex justify="center" py={10}>
          <Spinner color={G.gold} />
        </Flex>
      )}
      {failed && (
        <Text color={G.muted} fontSize="sm" p={4}>
          Details could not load. Try again in a moment.
        </Text>
      )}

      {entry && (
        <Stack gap={4} p={4}>
          <Box>
            {hero && (
              <Box mb={1.5}>
                <TypeChip config={config} type={entry.type} />
              </Box>
            )}
            <Text
              as="h2"
              ref={titleRef}
              tabIndex={-1}
              outline="none"
              color="white"
              fontWeight="800"
              fontSize="xl"
              lineHeight="1.2"
            >
              {entry.title}
            </Text>
            {(eraLabels.length > 0 || facts.length > 0) && (
              <Text color={G.muted} fontSize="sm" mt={1.5}>
                {[
                  ...eraLabels,
                  ...facts.map((f) => `${f.label}: ${f.text}`),
                ].join("  ·  ")}
              </Text>
            )}
            {entry.status === "unconfirmed" && (
              <Box mt={2}>
                <UnconfirmedBadge label={config.features.unconfirmedLabel} />
              </Box>
            )}
          </Box>

          <Button
            alignSelf="flex-start"
            size="sm"
            borderRadius="999px"
            fontWeight="700"
            bg={isFound ? GREEN : G.gold}
            color={G.ink}
            _hover={{ opacity: 0.9 }}
            onClick={() => onToggleFound(entry.id)}
            aria-pressed={isFound}
          >
            {isFound && <FiCheck aria-hidden />}
            {isFound ? "Found" : "Mark found"}
          </Button>

          {entry.summary && (
            <Text color={G.text} fontSize="md">
              {entry.summary}
            </Text>
          )}

          {longFields.map((f) => (
            <Box key={f.key}>
              <Text fontSize="sm" color={G.muted} fontWeight="700" mb={1}>
                {f.label}
              </Text>
              <FieldValue
                field={f}
                value={entry.fields[f.key]}
                gameSlug={slug}
                config={config}
              />
            </Box>
          ))}

          {gallery.length > 0 && (
            <HStack gap={2} overflowX="auto" pb={1}>
              {gallery.map((m) => (
                <Box
                  key={m.url}
                  position="relative"
                  minW="140px"
                  h="90px"
                  borderRadius="8px"
                  overflow="hidden"
                >
                  <NextImage
                    src={m.url}
                    alt={m.alt ?? ""}
                    fill
                    sizes="140px"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              ))}
            </HStack>
          )}

          {entry.linkedFrom.map((g) => {
            const gt = typeOf(config, g.type);
            const total = g.entries.length;
            const done = g.entries.filter((r) => found.has(r.id)).length;
            const onMap = g.entries.filter((r) => pinned.has(r.id));
            const label = gt?.plural ?? g.type;
            return (
              <Box key={`${g.type}-${g.field}`}>
                <Flex align="center" justify="space-between" mb={1.5}>
                  <HStack gap={2}>
                    <Box
                      w="9px"
                      h="9px"
                      borderRadius="full"
                      bg={gt?.color ?? G.muted}
                    />
                    <Text fontSize="sm" color="white" fontWeight="700">
                      {label}
                    </Text>
                    <Text fontSize="sm" color={G.muted}>
                      {done} / {total}
                    </Text>
                  </HStack>
                  {onMap.length > 0 && (
                    <Button
                      size="xs"
                      variant="outline"
                      borderRadius="999px"
                      borderColor={G.line}
                      color={G.text}
                      _hover={{ bg: "rgba(255,255,255,0.06)" }}
                      onClick={() =>
                        onShowOnMap(
                          onMap.map((r) => r.id),
                          `${label} in ${entry.title}`,
                        )
                      }
                    >
                      <FiMapPin aria-hidden />
                      Show on map
                    </Button>
                  )}
                </Flex>
                <Box
                  h="4px"
                  bg="rgba(255,255,255,0.08)"
                  borderRadius="999px"
                  overflow="hidden"
                  mb={2}
                >
                  <Box
                    h="100%"
                    w={`${total ? Math.round((done / total) * 100) : 0}%`}
                    bg={GREEN}
                  />
                </Box>
                <Stack gap={0}>
                  {g.entries.map((r) => {
                    const f = found.has(r.id);
                    return (
                      <Flex
                        key={r.id}
                        align="center"
                        gap={2}
                        py={1.5}
                        borderBottom="1px solid"
                        borderColor="rgba(255,255,255,0.05)"
                      >
                        <Box
                          as="button"
                          flex="1"
                          textAlign="left"
                          color={f ? G.muted : G.text}
                          textDecoration={f ? "line-through" : "none"}
                          fontSize="sm"
                          _hover={{ color: "white" }}
                          onClick={() => onOpenEntry(r.slug)}
                        >
                          {r.title}
                        </Box>
                        <Box
                          as="button"
                          aria-label={
                            f ? `Unmark ${r.title}` : `Mark ${r.title} found`
                          }
                          aria-pressed={f}
                          title={f ? "Found" : "Mark found"}
                          color={f ? GREEN : G.muted}
                          _hover={{ color: f ? GREEN : "white" }}
                          p={1}
                          onClick={() => onToggleFound(r.id)}
                        >
                          {f ? <FiCheck /> : <FiCircle />}
                        </Box>
                      </Flex>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
