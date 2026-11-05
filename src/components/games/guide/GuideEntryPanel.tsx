"use client";

// An entry's details opened ON the map (side panel on desktop, a sheet under
// the map on phones), so reading about a pin never leaves the map. Links to
// other entries inside the panel open in the panel too. The entry pages
// still exist for search engines and sharing; the map just doesn't send
// readers to them.
import { useEffect, useState, type MouseEvent } from "react";
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
import { FiCheck, FiX } from "react-icons/fi";
import {
  typeOf,
  type HubEntryFull,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import {
  FieldValue,
  G,
  hasFieldValue,
  LinkChips,
  TypeChip,
  UnconfirmedBadge,
} from "@/components/games/guide/GuideBits";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Entries already opened this visit (small; cleared on reload). Only
// successful loads are kept, so a failed fetch is retried next time.
const cache = new Map<string, HubEntryFull>();

type Props = {
  slug: string;
  config: HubTemplateConfig;
  entrySlug: string;
  /** Entry ids the reader has marked found. */
  found: ReadonlySet<string>;
  onToggleFound: (entryId: string) => void;
  onOpenEntry: (entrySlug: string) => void;
  onClose: () => void;
};

export default function GuideEntryPanel({
  slug,
  config,
  entrySlug,
  found,
  onToggleFound,
  onOpenEntry,
  onClose,
}: Props) {
  const key = `${slug}/${entrySlug}`;
  const [entry, setEntry] = useState<HubEntryFull | null>(
    cache.get(key) ?? null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hit = cache.get(key);
    setFailed(false);
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

  // Links to other entries of this game (field links, related chips) open
  // here instead of navigating. New-tab clicks still go to the page.
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
  const isFound = !!entry && found.has(entry.id);
  const typeLabel = (k: string) => typeOf(config, k)?.plural ?? k;

  return (
    <Box
      role="dialog"
      aria-label={entry?.title ?? "Details"}
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="14px"
      boxShadow="0 12px 40px rgba(0,0,0,0.5)"
      overflowY="auto"
      onClickCapture={keepOnMap}
    >
      <Flex
        position="sticky"
        top={0}
        zIndex={1}
        bg={G.panel}
        justify="space-between"
        align="center"
        px={4}
        pt={3}
        pb={2}
        borderBottom="1px solid"
        borderColor={G.line}
      >
        {entry ? <TypeChip config={config} type={entry.type} /> : <Box />}
        <Button
          size="xs"
          variant="ghost"
          color={G.text}
          _hover={{ bg: "rgba(255,255,255,0.08)" }}
          onClick={onClose}
          aria-label="Close details"
        >
          <FiX />
        </Button>
      </Flex>

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
            <Text
              as="h2"
              color="white"
              fontWeight="800"
              fontSize="xl"
              lineHeight="1.2"
            >
              {entry.title}
            </Text>
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
            bg={isFound ? "#7EE2A0" : G.gold}
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

          {entry.media[0] && (
            <Box
              position="relative"
              w="100%"
              h="180px"
              borderRadius="10px"
              overflow="hidden"
            >
              <NextImage
                src={entry.media[0].url}
                alt={entry.media[0].alt ?? entry.title}
                fill
                sizes="380px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          )}

          {(t?.fields ?? []).map((f) => {
            const v = entry.fields[f.key];
            if (!hasFieldValue(f, v)) return null;
            return (
              <Box key={f.key}>
                <Text fontSize="sm" color={G.muted} fontWeight="700" mb={1}>
                  {f.label}
                </Text>
                <FieldValue
                  field={f}
                  value={v}
                  gameSlug={slug}
                  config={config}
                />
              </Box>
            );
          })}

          {entry.media.length > 1 && (
            <HStack gap={2} overflowX="auto">
              {entry.media.slice(1).map((m) => (
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

          {entry.linkedFrom.map((g) => (
            <Box key={`${g.type}-${g.field}`}>
              <Text fontSize="sm" color={G.muted} fontWeight="700" mb={2}>
                Related {typeLabel(g.type).toLowerCase()}
              </Text>
              <LinkChips refs={g.entries} gameSlug={slug} config={config} />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
