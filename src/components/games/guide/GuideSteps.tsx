"use client";

// Walkthrough steps, one look everywhere (any game, any page): numbered
// cards with Up next / Done / Later and the reward from each step's linked
// entry. "next" = five cards around the reader's next undone step (hub strip,
// Steps block); "all" = every step (the walkthrough page itself). A step
// shows only when both the step page and its entry pass the reader's era /
// spoiler choices.
import NextLink from "next/link";
import { Box, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import {
  eraVisible,
  guidePath,
  spoilerVisible,
  typeOf,
  type HubCard,
  type HubPageNode,
  type HubTemplateConfig,
} from "@/lib/hub-engine/types";
import { G, hasFieldValue } from "@/components/games/guide/GuideBits";
import { useGuideProgress } from "@/components/games/guide/GuideProgress";

const GREEN = "#7EE2A0";

export type Step = {
  key: string;
  n: number;
  title: string;
  href: string;
  /** The entry behind the step (done state, reward). */
  card: HubCard | null;
  spoilerStage: string | null;
  eras: string[];
};

/** A page's sub-pages as steps. */
export function stepsOfNode(slug: string, node: HubPageNode): Step[] {
  return node.children.map((c, i) => ({
    key: c.slug,
    n: i + 1,
    title: c.title,
    href: guidePath(slug, c.slug),
    card: c.entry ?? null,
    spoilerStage: c.spoilerStage,
    eras: c.eras,
  }));
}

export function StepCards({
  id,
  config,
  title,
  allHref,
  steps: all,
  show,
  headingAs = "h3",
}: {
  id?: string;
  config: HubTemplateConfig;
  title: string | null;
  /** "All N steps" link (only in "next"). */
  allHref?: string | null;
  steps: Step[];
  show: "next" | "all";
  headingAs?: "h2" | "h3";
}) {
  const { found, era, spoiler } = useGuideProgress();
  const { eraSwitch, spoilers } = config.features;
  const ok = (eras: string[], stage: string | null) =>
    eraVisible(eras, eraSwitch ? era : null) &&
    (!spoilers || spoilerVisible(config.spoilerStages, stage, spoiler));
  const steps = all.filter(
    (x) =>
      ok(x.eras, x.spoilerStage) &&
      (!x.card || ok(x.card.eras, x.card.spoilerStage)),
  );
  if (!all.length) return null;
  const hidden = all.length - steps.length;
  const isDone = (x: Step) => !!x.card && found.has(x.card.id);
  const next = steps.findIndex((x) => !isDone(x));
  const start =
    show === "all"
      ? 0
      : Math.max(0, Math.min(next < 0 ? steps.length : next, steps.length) - 1);
  const shown = show === "all" ? steps : steps.slice(start, start + 5);
  const doneCount = steps.filter(isDone).length;
  return (
    <Box id={id} scrollMarginTop="140px">
      <HStack justify="space-between" align="baseline" mb={3} wrap="wrap">
        {title && (
          <Heading as={headingAs} fontSize="xl" color="white">
            {title}
          </Heading>
        )}
        {show === "next" && allHref && all.length > 5 ? (
          <NextLink href={allHref}>
            <Text color={G.gold} fontWeight="700" fontSize="sm">
              All {all.length} steps
            </Text>
          </NextLink>
        ) : (
          <Text color={G.muted} fontSize="sm" fontWeight="700">
            {doneCount} of {steps.length} done
          </Text>
        )}
      </HStack>
      <SimpleGrid
        columns={
          show === "all" ? { base: 1, sm: 2, lg: 3 } : { base: 1, sm: 2, lg: 5 }
        }
        gap={3}
      >
        {shown.map((x, i) => {
          const done = isDone(x);
          const isNext = !done && start + i === next;
          const c = x.card;
          const reward = c
            ? (typeOf(config, c.type)?.fields ?? []).find(
                (f) =>
                  f.onCard &&
                  f.kind === "text" &&
                  hasFieldValue(f, c.fields[f.key]),
              )
            : undefined;
          return (
            <NextLink key={x.key} href={x.href}>
              <Box
                h="100%"
                bg={G.panel}
                border="1px solid"
                borderColor={
                  isNext
                    ? "rgba(255,215,0,0.6)"
                    : done
                      ? "rgba(126,226,160,0.35)"
                      : G.line
                }
                borderRadius="12px"
                p={3.5}
                display="flex"
                flexDirection="column"
                gap={1.5}
                _hover={{ borderColor: G.gold }}
              >
                <HStack justify="space-between">
                  <Text fontSize="xs" fontWeight="700" color={G.muted}>
                    STEP {x.n}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color={done ? GREEN : isNext ? G.gold : G.muted}
                  >
                    {done ? "Done" : isNext ? "Up next" : "Later"}
                  </Text>
                </HStack>
                <Text fontWeight="700" color="white" lineHeight="1.3">
                  {x.title}
                </Text>
                {reward && c && (
                  <Text fontSize="xs" color={G.muted} mt="auto">
                    {reward.label}: {String(c.fields[reward.key])}
                  </Text>
                )}
              </Box>
            </NextLink>
          );
        })}
      </SimpleGrid>
      {hidden > 0 && (
        <Text fontSize="xs" color={G.muted} mt={2}>
          {hidden} more step{hidden === 1 ? " is" : "s are"} hidden to avoid
          spoilers. Change Spoilers above to see them.
        </Text>
      )}
    </Box>
  );
}
