import { Box, Flex, Grid, Text, HStack } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Spec = NonNullable<NonNullable<PublicPost["formatData"]>["hardwareSpec"]>;

/**
 * Hardware core module: a "versus-screen" spec face-off (device A vs. device B,
 * fighting-game style) + the spec rows + "who it's for" chips. Custom-styled to
 * match the navy card system. Reporting-only: it states the specs; the reader
 * gives the buy verdict via the poll.
 *
 * Two-device stories get the versus banner; a single-device story falls back to
 * a clean spec-sheet header. The table needs >= 1 row; the chips render
 * independently; the whole block hides only when there's neither.
 */
export default function HardwareSpecBlock({
  spec,
  whoFor,
}: {
  spec?: Spec | null;
  whoFor?: string[] | null;
}) {
  const rows = spec?.rows ?? [];
  const chips = (whoFor ?? []).filter(Boolean);
  if (rows.length === 0 && chips.length === 0) return null;

  const hasB =
    !!spec?.compareLabels?.b || rows.some((r) => !!r.b && String(r.b).trim());
  const labelA = spec?.compareLabels?.a || "Spec";
  const labelB = spec?.compareLabels?.b || "";
  const cols = hasB
    ? "minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)"
    : "minmax(0,1fr) minmax(0,1.4fr)";

  return (
    <Box my={8}>
      {rows.length > 0 && (
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          overflow="hidden"
        >
          {hasB ? (
            /* Versus-screen matchup banner */
            <Flex
              position="relative"
              align="stretch"
              gap={{ base: 3, md: 5 }}
              p={{ base: 3, md: 4 }}
              borderBottom="1px solid"
              borderColor="whiteAlpha.200"
              bg="whiteAlpha.50"
            >
              <Flex
                flex="1"
                direction="column"
                align="center"
                justify="center"
                minH={{ base: "72px", md: "88px" }}
                px={2}
                py={4}
                borderRadius="xl"
                border="1px solid"
                borderColor="nexzy.lightBlue"
                bg="linear-gradient(180deg, rgba(0,123,255,0.14), rgba(0,123,255,0.03))"
              >
                <Text
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "sm", md: "xl" }}
                  color="nexzy.lightBlue"
                  textAlign="center"
                  lineHeight="1.2"
                >
                  {labelA}
                </Text>
              </Flex>

              <Flex
                position="absolute"
                left="50%"
                top="50%"
                transform="translate(-50%, -50%)"
                w={{ base: "44px", md: "56px" }}
                h={{ base: "44px", md: "56px" }}
                borderRadius="full"
                bg="nexzy.navy"
                border="2px solid"
                borderColor="nexzy.gold"
                boxShadow="0 0 22px rgba(255,196,0,0.35)"
                align="center"
                justify="center"
                zIndex={1}
              >
                <Text
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "sm", md: "lg" }}
                  color="nexzy.gold"
                >
                  VS
                </Text>
              </Flex>

              <Flex
                flex="1"
                direction="column"
                align="center"
                justify="center"
                minH={{ base: "72px", md: "88px" }}
                px={2}
                py={4}
                borderRadius="xl"
                border="1px solid"
                borderColor="purple.400"
                bg="linear-gradient(180deg, rgba(168,85,247,0.14), rgba(168,85,247,0.03))"
              >
                <Text
                  fontFamily="heading"
                  fontWeight="700"
                  fontSize={{ base: "sm", md: "xl" }}
                  color="purple.300"
                  textAlign="center"
                  lineHeight="1.2"
                >
                  {labelB}
                </Text>
              </Flex>
            </Flex>
          ) : (
            /* Single-device spec sheet header */
            <Box
              px={{ base: 4, md: 6 }}
              py={4}
              bg="whiteAlpha.100"
              borderBottom="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text
                fontFamily="heading"
                fontWeight="700"
                fontSize={{ base: "md", md: "lg" }}
                color="nexzy.lightBlue"
              >
                {labelA}
              </Text>
            </Box>
          )}

          {/* Spec rows */}
          {rows.map((r, i) => (
            <Grid
              key={i}
              templateColumns={cols}
              gap={3}
              px={{ base: 4, md: 6 }}
              py={3}
              borderTop={i === 0 ? "none" : "1px solid"}
              borderColor="whiteAlpha.100"
              alignItems="center"
            >
              <Text fontSize="sm" color="gray.500">
                {r.k}
              </Text>
              <Text
                fontSize="sm"
                color="nexzy.lightBlue"
                fontWeight="600"
                textAlign={hasB ? "center" : "left"}
              >
                {r.a || "—"}
              </Text>
              {hasB && (
                <Text
                  fontSize="sm"
                  color="purple.200"
                  fontWeight="600"
                  textAlign="center"
                >
                  {r.b || "—"}
                </Text>
              )}
            </Grid>
          ))}
        </Box>
      )}

      {chips.length > 0 && (
        <Box mt={rows.length > 0 ? 4 : 0}>
          <Text
            fontFamily="heading"
            fontSize="xs"
            letterSpacing="wide"
            textTransform="uppercase"
            color="gray.400"
            mb={2}
          >
            Who it&apos;s for
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {chips.map((c, i) => (
              <Box
                key={i}
                bg="purple.400/15"
                color="purple.200"
                border="1px solid"
                borderColor="purple.400/30"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="sm"
              >
                {c}
              </Box>
            ))}
          </HStack>
        </Box>
      )}
    </Box>
  );
}
