"use client";

// The /games/<slug>/guide page: the same Guide contents as the hub, full
// width, with the reader's progress (done steps) and spoiler masking.
import type { HubPageNode, HubTemplateConfig } from "@/lib/hub-engine/types";
import { GuideProgressProvider } from "@/components/games/guide/GuideProgress";
import { GuideContentsHub } from "@/components/games/guide/GuideContents";
import { GuidePrefs } from "@/components/games/guide/GuideSections";
import { Flex } from "@chakra-ui/react";

export default function GuideIndexBody({
  slug,
  config,
  pages,
  counts,
}: {
  slug: string;
  config: HubTemplateConfig;
  pages: HubPageNode[];
  counts: Record<string, number> | null;
}) {
  return (
    <GuideProgressProvider slug={slug}>
      <Flex justify="flex-end" mb={4}>
        <GuidePrefs config={config} />
      </Flex>
      <GuideContentsHub
        slug={slug}
        config={config}
        pages={pages}
        counts={counts}
        limit={Infinity}
      />
    </GuideProgressProvider>
  );
}
