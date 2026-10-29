"use client";

// "Predict the Nexzy Players score": one changeable pick per account until
// launch, then locked. Results show after you pick (no herding before).
// Once the Players score settles (7 days + 25 ratings), the section shows the
// verdict: the crowd's pick vs the real score, the right band, and for the
// signed-in reader "You called it" or "Not this time".
import { Box, HStack, SimpleGrid, Text, chakra } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useHubLive } from "./HubLiveProvider";
import { BAND_INFO, PREDICTION_BANDS, type PredictionBand } from "@/lib/hubs/types";
import { track } from "@/lib/analytics";

export interface SettledVerdict {
  score: number;
  band: string;
}

export default function PredictScore({ settled }: { settled?: SettledVerdict | null }) {
  const { slug, live, me, busy, predict, error } = useHubLive();
  const tally = live.predictions;
  const picked = me?.prediction ?? null;
  const showResults = !!picked || live.locked || !!settled;
  const top =
    tally.total >= 10
      ? PREDICTION_BANDS.reduce((a, b) => (tally[b] > tally[a] ? b : a))
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
              ? `The crowd predicted ${BAND_INFO[top].score}. `
              : `${tally.total.toLocaleString("en-US")} players predicted. `}
            Nexzy Players gave it{" "}
            <Text as="span" fontFamily="title" color="#FFD700">
              {settled.score.toFixed(1)}
            </Text>
            .
          </Text>
          {calledIt !== null && (
            <Text
              mt={2}
              fontWeight="700"
              color={calledIt ? "#7EE2A0" : "#c7cde0"}
              role="status"
            >
              {calledIt
                ? "You called it."
                : `Not this time. You picked ${BAND_INFO[picked as PredictionBand].score}.`}
            </Text>
          )}
        </Box>
      )}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
        {PREDICTION_BANDS.map((b) => {
          const on = picked === b;
          const right = rightBand === b;
          const pct = tally.total
            ? Math.round((tally[b] / tally.total) * 100)
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
                {BAND_INFO[b].score}
              </Text>
              <HStack justify="space-between" gap={2}>
                <Text fontSize="sm" color="#9aa3bf">
                  {right
                    ? "Right call"
                    : on && settled
                      ? "Your pick"
                      : top === b
                        ? "Most picked"
                        : BAND_INFO[b].label}
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
          ? `${tally.total.toLocaleString("en-US")} players predicted. The score settled 7 days after launch.`
          : live.locked
            ? `Predictions are locked. The verdict lands when the Players score settles. ${tally.total.toLocaleString("en-US")} predictions.`
            : picked
              ? `Your pick is in. You can change it until launch. ${tally.total.toLocaleString("en-US")} predictions so far.`
              : "Pick one. Results show after you vote, and we'll tell you if you called it once the player score settles."}
      </Text>
      {error && (
        <Text fontSize="xs" color="red.300" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  );
}
