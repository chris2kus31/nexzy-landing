"use client";

// An entry's details in a window over the page (tracker tables, any game):
// readers see how to get it, its facts and photos without leaving the page.
// Same panel as the map's, same "found" progress. The entry's own page still
// exists for search engines and new-tab clicks.
import { Box, Dialog, Portal } from "@chakra-ui/react";
import type { HubEntryFull, HubTemplateConfig } from "@/lib/hub-engine/types";
import GuideEntryPanel from "@/components/games/guide/GuideEntryPanel";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";

const EMPTY = new Set<string>();

export default function GuideEntryDialog({
  slug,
  config,
  entrySlug,
  onOpenEntry,
  onClose,
  onShowOnPage,
}: {
  slug: string;
  config: HubTemplateConfig;
  /** Open when set. */
  entrySlug: string | null;
  onOpenEntry: (entrySlug: string) => void;
  onClose: () => void;
  /** On a guide page: show the entry on that page's map, when it can. */
  onShowOnPage?: (e: HubEntryFull) => (() => void) | null;
}) {
  const { found, toggle } = useGuideProgress();
  return (
    <Dialog.Root
      open={!!entrySlug}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop bg="rgba(5,7,18,0.72)" />
        {/* Centered on desktop wherever the reader has scrolled; a sheet
            from the bottom on phones (thumb reach). */}
        <Dialog.Positioner
          position="fixed"
          inset={0}
          display="flex"
          alignItems={{ base: "flex-end", md: "center" }}
          justifyContent="center"
          p={{ base: 0, md: 6 }}
        >
          <Dialog.Content
            bg="transparent"
            boxShadow="none"
            m={0}
            w={{ base: "100%", md: "560px" }}
            maxW="100%"
            maxH={{ base: "88dvh", md: "85vh" }}
            overflowY="auto"
            borderRadius={{ base: "16px 16px 0 0", md: "14px" }}
          >
            <Dialog.Title srOnly>Details</Dialog.Title>
            <Box>
              {entrySlug && (
                <GuideEntryPanel
                  key={entrySlug}
                  slug={slug}
                  config={config}
                  entrySlug={entrySlug}
                  found={found}
                  pinned={EMPTY}
                  onToggleFound={toggle}
                  onOpenEntry={onOpenEntry}
                  onShowOnMap={() => {}}
                  onClose={onClose}
                  pageLink
                  embedded
                  showHere={onShowOnPage}
                  mapHref={(e) =>
                    e.pins.length && config.maps.length
                      ? `/games/${slug}/map?entry=${encodeURIComponent(e.slug)}`
                      : null
                  }
                />
              )}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
