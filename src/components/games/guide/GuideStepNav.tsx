"use client";

// Story walkthrough step controls on an entry page (the entry is an item of
// a checklist with the Story switch): Mark done (the same progress as the
// map and checklists) and Previous / Next step. A later step's title is
// hidden behind the reader's spoiler setting, like everywhere else.
import NextLink from "next/link";
import { Box, Flex, Text } from "@chakra-ui/react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import {
  entryPath,
  spoilerVisible,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";
import {
  GuideProgressProvider,
  useGuideProgress,
} from "@/components/games/guide/GuideProgress";

const GREEN = "#7EE2A0";

export type StepRef = {
  slug: string;
  type: string;
  title: string;
  spoilerStage: string | null;
};

export default function GuideStepNav(props: {
  slug: string;
  config: Pick<HubTemplateConfig, "features" | "spoilerStages">;
  entryId: string;
  listKey: string;
  listTitle: string;
  position: number;
  total: number;
  prev: StepRef | null;
  next: StepRef | null;
}) {
  return (
    <GuideProgressProvider slug={props.slug}>
      <Inner {...props} />
    </GuideProgressProvider>
  );
}

function Inner({
  slug,
  config,
  entryId,
  listKey,
  listTitle,
  position,
  total,
  prev,
  next,
}: {
  slug: string;
  config: Pick<HubTemplateConfig, "features" | "spoilerStages">;
  entryId: string;
  listKey: string;
  listTitle: string;
  position: number;
  total: number;
  prev: StepRef | null;
  next: StepRef | null;
}) {
  const { found, toggle, spoiler } = useGuideProgress();
  const done = found.has(entryId);
  const title = (s: StepRef) =>
    config.features.spoilers &&
    s.spoilerStage &&
    !spoilerVisible(config.spoilerStages, s.spoilerStage, spoiler)
      ? "Spoiler step"
      : s.title;
  const card = (dir: "prev" | "next", s: StepRef) => (
    <Flex
      asChild
      flex="1"
      minW="200px"
      direction="column"
      align={dir === "next" ? "flex-end" : "flex-start"}
      textAlign={dir === "next" ? "right" : "left"}
      gap={1}
      bg={G.panel}
      border="1px solid"
      borderColor={G.line}
      borderRadius="12px"
      p={4}
      _hover={{ borderColor: G.gold }}
    >
      <NextLink href={entryPath(slug, s.type, s.slug)} rel={dir}>
        <Flex align="center" gap={1.5} color={G.gold} fontSize="sm" fontWeight="700">
          {dir === "prev" && <FiArrowLeft aria-hidden />}
          {dir === "prev" ? "Previous step" : "Next step"}
          {dir === "next" && <FiArrowRight aria-hidden />}
        </Flex>
        <Text color="white" fontWeight="700">
          {title(s)}
        </Text>
      </NextLink>
    </Flex>
  );
  return (
    <Box
      mt={8}
      pt={6}
      borderTop="1px solid"
      borderColor={G.line}
    >
      <Flex align="center" gap={3} wrap="wrap" mb={4}>
        <Text color={G.muted} fontSize="sm" flex="1">
          Step {position} of {total} in{" "}
          <NextLink
            href={`/games/${slug}/checklist/${listKey}`}
            style={{ color: G.gold, textDecoration: "underline" }}
          >
            {listTitle}
          </NextLink>
        </Text>
        <Flex
          as="button"
          role="checkbox"
          aria-checked={done}
          onClick={() => toggle(entryId)}
          align="center"
          gap={2}
          px={4}
          py={2}
          borderRadius="999px"
          border="1px solid"
          borderColor={done ? GREEN : G.gold}
          bg={done ? "rgba(126,226,160,0.12)" : G.gold}
          color={done ? GREEN : G.ink}
          fontWeight="800"
          fontSize="sm"
        >
          <FiCheck aria-hidden />
          {done ? "Done" : "Mark done"}
        </Flex>
      </Flex>
      {(prev || next) && (
        <Flex gap={3} wrap="wrap">
          {prev ? card("prev", prev) : <Box flex="1" />}
          {next ? card("next", next) : <Box flex="1" />}
        </Flex>
      )}
    </Box>
  );
}
