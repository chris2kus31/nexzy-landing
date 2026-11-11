"use client";

// "Predict the Nexzy Players score": one changeable pick per account until
// launch, then locked. Results show after you pick (no herding before).
// Once the Players score settles (7 days + 25 ratings), the section shows the
// verdict: the crowd's pick vs the real score, the right band, and for the
// signed-in reader "You called it" or "Not this time".
import { Box, HStack, SimpleGrid, Text, chakra } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useHubLive } from "./HubLiveProvider";
import type { PredictionBand } from "@/lib/hubs/types";
import { useHubT } from "./HubCopyProvider";
import { track } from "@/lib/analytics";

export interface SettledVerdict {
  score: number;
  band: string;
}

export default function PredictScore({ settled }: { settled?: SettledVerdict | null }) {
  const { slug, live, me, busy, predict, error } = useHubLive();
  const t = useHubT();
  // Bands and their order come from the API with the wording.
  const bands = t.list("predictionBands") as PredictionBand[];
  const range = (b: string) => t(`predict.band.${b}.range`);
  const tally = live.predictions;
  const picked = me?.prediction ?? null;
  const showResults = !!picked || live.locked || !!settled;
  const top =
    tally.total >= 10
      ? bands.reduce((a, b) => ((tally[b] ?? 0) > (tally[a] ?? 0) ? b : a))
      : null;
  const rightBand = settled ? (settled.band as PredictionBand) : null;
  const calledIt = settled && picked ? picked === rightBand : null;

  // Count each verdict view once per page load (signed-in pickers only).
  const tracked = useRef(false);
  useEffect(() => {
    if (calledIt === null || tracked.current) return;
    tracked.current = true;
    track("hub_called_it_view", { slug, result: calledIt ? "right" : "wrong" });
  }, [calledIt, slug]);

  return (
    <Box>
      {settled && (
        <Box mb={4}>
          <Text color="white" fontSize={{ base: "md", md: "lg" }}>
            {top
              ? t("predict.crowdPick", { score: range(top) })
              : t("predict.crowdCount", {
                  count: tally.total.toLocaleString("en-US"),
                })}{" "}
            {t.parts("predict.gaveIt", { score: settled.score.toFixed(1) }).map(
              (p, i) =>
                p.token === "score" ? (
                  <Text key={i} as="span" fontFamily="title" color="#FFD700">
                    {p.text}
                  </Text>
                ) : (
                  p.text
                ),
            )}
          </Text>
          {calledIt !== null && (
            <Text
              mt={2}
              fontWeight="700"
              color={calledIt ? "#7EE2A0" : "#c7cde0"}
              role="status"
            >
              {calledIt
                ? t("predict.called")
                : t("predict.notThisTime", { score: range(picked as string) })}
            </Text>
          )}
        </Box>
      )}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
        {bands.map((b) => {
          const on = picked === b;
          const right = rightBand === b;
          const pct = tally.total
            ? Math.round(((tally[b] ?? 0) / tally.total) * 100)
            : 0;
          const accent = right ? "#7EE2A0" : "#FFD700";
          return (
            <chakra.button
              key={b}
              type="button"
              onClick={() => !on && !live.locked && predict(b)}
              disabled={busy || live.locked}
              aria-pressed={on}
              position="relative"
              overflow="hidden"
              textAlign="left"
              bg="#11152b"
              border="1px solid"
              borderColor={right ? "#7EE2A0" : on ? "#FFD700" : "whiteAlpha.200"}
              borderRadius="12px"
              p={4}
              cursor={live.locked ? "default" : "pointer"}
              transition="border-color 0.15s"
              _hover={live.locked ? {} : { borderColor: "#FFD700" }}
            >
              {showResults && (
                <Box
                  position="absolute"
                  left={0}
                  bottom={0}
                  h="3px"
                  w={`${pct}%`}
                  bg={right || on ? accent : "whiteAlpha.400"}
                />
              )}
              <Text
                fontFamily="title"
                fontSize="xl"
                color={right ? "#7EE2A0" : on ? "#FFD700" : "white"}
              >
                {range(b)}
              </Text>
              <HStack justify="space-between" gap={2}>
                <Text fontSize="sm" color="#9aa3bf">
                  {right
                    ? t("predict.rightCall")
                    : on && settled
                      ? t("predict.yourPick")
                      : top === b
                        ? t("predict.mostPicked")
                        : t(`predict.band.${b}.label`)}
                </Text>
                {showResults && (
                  <Text fontSize="sm" color="#c7cde0" fontWeight="600">
                    {pct}%
                  </Text>
                )}
              </HStack>
            </chakra.button>
          );
        })}
      </SimpleGrid>
      <Text fontSize="xs" color="#9aa3bf" mt={3}>
        {settled
          ? t("predict.foot.settled", { count: tally.total.toLocaleString("en-US") })
          : live.locked
            ? t("predict.foot.locked", {
                count: tally.total.toLocaleString("en-US"),
              })
            : picked
              ? t("predict.foot.picked", {
                  count: tally.total.toLocaleString("en-US"),
                })
              : t("predict.foot.open")}
      </Text>
      {error && (
        <Text fontSize="xs" color="red.300" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  );
}
