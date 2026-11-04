"use client";

// A checklist page body: every item with a tick box and a progress bar.
// Ticks are free; guests keep them in the browser until they sign in. Items
// beyond the reader's spoiler choice are counted but not shown.
import { useMemo } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { FiCheck } from "react-icons/fi";
import type {
  HubChecklistPage,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G, GuideCard } from "@/components/games/guide/GuideBits";
import {
  GuideProgressProvider,
  useGuideProgress,
} from "@/components/games/guide/GuideProgress";
import { GuidePrefs, useVisible } from "@/components/games/guide/GuideSections";

export default function GuideChecklist({
  slug,
  config,
  list,
}: {
  slug: string;
  config: HubTemplateConfig;
  list: HubChecklistPage;
}) {
  return (
    <GuideProgressProvider slug={slug}>
      <Body slug={slug} config={config} list={list} />
    </GuideProgressProvider>
  );
}

function Body({
  slug,
  config,
  list,
}: {
  slug: string;
  config: HubTemplateConfig;
  list: HubChecklistPage;
}) {
  const { found, toggle, signedIn, ready } = useGuideProgress();
  const visible = useVisible(config);
  const shown = useMemo(
    () => list.items.filter(visible),
    [list.items, visible],
  );
  const done = list.items.filter((i) => found.has(i.id)).length;
  const total = list.items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Stack gap={4}>
      <Box
        bg={G.panel}
        borderRadius="14px"
        p={4}
        border="1px solid"
        borderColor={G.line}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Text color="white" fontWeight="800" fontSize="xl" aria-live="polite">
            {ready ? `${done} / ${total} found` : `${total} to find`}
          </Text>
          <GuidePrefs config={config} />
        </Flex>
        <Box
          mt={3}
          h="8px"
          bg={G.card}
          borderRadius="999px"
          overflow="hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <Box h="100%" w={`${pct}%`} bg={G.gold} transition="width 0.2s" />
        </Box>
        {!signedIn && done > 0 && (
          <Text mt={2} fontSize="sm" color={G.muted}>
            Saved in this browser. Sign in to keep your progress on every device
            and in the app.
          </Text>
        )}
      </Box>
      {total === 0 && (
        <Text color={G.muted}>Items are being added. Check back soon.</Text>
      )}
      {shown.length < total && (
        <Text fontSize="sm" color={G.muted}>
          {total - shown.length} hidden by your era or spoiler setting.
        </Text>
      )}
      <Stack gap={2}>
        {shown.map((c) => {
          const on = found.has(c.id);
          return (
            <GuideCard
              key={c.id}
              card={c}
              config={config}
              gameSlug={slug}
              compact
              right={
                <Box
                  as="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={on}
                  aria-label={
                    on ? `Unmark ${c.title}` : `Mark ${c.title} found`
                  }
                  w="34px"
                  h="34px"
                  borderRadius="8px"
                  border="2px solid"
                  borderColor={on ? "#7EE2A0" : G.line}
                  bg={on ? "#7EE2A0" : "transparent"}
                  color={G.ink}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  {on && <FiCheck size={18} />}
                </Box>
              }
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
