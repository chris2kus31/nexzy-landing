"use client";

// An entry's details in a window over the page (tracker tables, any game):
// readers see how to get it, its facts and photos without leaving the page.
// Same panel as the map's, same "found" progress. The entry's own page still
// exists for search engines and new-tab clicks.
import { Box, Dialog, Portal } from "@chakra-ui/react";
import type { HubTemplateConfig } from "@/lib/hub-engine/types";
import GuideEntryPanel from "@/components/games/guide/GuideEntryPanel";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";

const EMPTY = new Set<string>();

export default function GuideEntryDialog({
  slug,
  config,
  entrySlug,
  onOpenEntry,
  onClose,
}: {
  slug: string;
  config: HubTemplateConfig;
  /** Open when set. */
  entrySlug: string | null;
  onOpenEntry: (entrySlug: string) => void;
  onClose: () => void;
}) {
  const { found, toggle } = useGuideProgress();
  return (
    <Dialog.Root
      open={!!entrySlug}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      size={{ base: "full", md: "md" }}
    >
      <Portal>
        <Dialog.Backdrop bg="rgba(5,7,18,0.72)" />
        <Dialog.Positioner p={{ base: 0, md: 4 }}>
          <Dialog.Content
            bg="transparent"
            boxShadow="none"
            maxH={{ base: "100dvh", md: "88vh" }}
            my={{ md: "auto" }}
            overflowY="auto"
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
