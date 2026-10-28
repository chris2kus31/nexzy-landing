"use client";

// "Predict the Nexzy Players score": one changeable pick per account until
// launch, then locked. Results show after you pick (no herding before).
import { Box, HStack, SimpleGrid, Text, chakra } from "@chakra-ui/react";
import { useHubLive } from "./HubLiveProvider";
import { BAND_INFO, PREDICTION_BANDS } from "@/lib/hubs/types";

export default function PredictScore() {
  const { live, me, busy, predict, error } = useHubLive();
  const tally = live.predictions;
  const picked = me?.prediction ?? null;
  const showResults = !!picked || live.locked;
  const top =
    tally.total >= 10
      ? PREDICTION_BANDS.reduce((a, b) => (tally[b] > tally[a] ? b : a))
      : null;

  return (
    <Box>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
        {PREDICTION_BANDS.map((b) => {
          const on = picked === b;
          const pct = tally.total
            ? Math.round((tally[b] / tally.total) * 100)
            : 0;
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
              borderColor={on ? "#FFD700" : "whiteAlpha.200"}
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
                  bg={on ? "#FFD700" : "whiteAlpha.400"}
                />
              )}
              <Text
                fontFamily="title"
                fontSize="xl"
                color={on ? "#FFD700" : "white"}
              >
                {BAND_INFO[b].score}
              </Text>
              <HStack justify="space-between" gap={2}>
                <Text fontSize="sm" color="#9aa3bf">
                  {top === b ? "Most picked" : BAND_INFO[b].label}
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
        {live.locked
          ? `Predictions are locked. ${tally.total.toLocaleString("en-US")} players called it.`
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
