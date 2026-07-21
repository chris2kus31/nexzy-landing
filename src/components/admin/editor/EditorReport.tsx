"use client";

import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Badge,
} from "@chakra-ui/react";

/**
 * The AI editor's report card (verdict, scores, flags, and the auto-revision
 * before/after log). Shared by the article and guide editors: it renders both
 * the news styleScore shape and the guide originality/usefulness/slop shape
 * off the same editorReport blob.
 */
export default function EditorReport({
  report,
  wide = false,
}: {
  report: Record<string, unknown> | null;
  wide?: boolean;
}) {
  if (!report) return null;
  const verdict = String(report.verdict ?? "—");
  const factCheck = Array.isArray(report.factCheck)
    ? (report.factCheck as { claim: string; supported: boolean }[])
    : [];
  const issues = Array.isArray(report.issues)
    ? (report.issues as string[])
    : [];
  const revisionLog = Array.isArray(report.revisionLog)
    ? (report.revisionLog as { before: string; after: string; why: string }[])
    : [];
  const autoRevised = !!report.autoRevised;

  // Guide Editor extras (guides only). Absent on news articles.
  const isGuideEditor = report.agent === "guide-editor";
  const suspectClaims = Array.isArray(report.suspectClaims)
    ? (report.suspectClaims as string[])
    : [];
  const gScores: [string, unknown][] = [
    ["Originality", report.originalityScore],
    ["Usefulness", report.usefulnessScore],
    ["Slop (lower=better)", report.slopScore],
  ].filter(([, v]) => v != null) as [string, unknown][];
  const gameInDb =
    typeof report.gameInDb === "boolean" ? (report.gameInDb as boolean) : null;

  // Verdict → color: pass/publish = green, reject/fail = red, revise = amber.
  const v = verdict.toLowerCase();
  const verdictPalette =
    v.includes("pass") ||
    v.includes("publish") ||
    v.includes("approve") ||
    v === "ok"
      ? "green"
      : v.includes("reject") || v.includes("fail")
        ? "red"
        : v === "—"
          ? "gray"
          : "orange";

  // Score chips: guides show Originality/Usefulness/Slop; news shows Style.
  const scoreChips: [string, unknown][] = isGuideEditor
    ? gScores
    : report.styleScore != null
      ? [["Style", report.styleScore]]
      : [];

  // Tone a score value: higher is better, except "slop" where lower is better.
  const scoreTone = (label: string, val: unknown): string => {
    const n = Number(val);
    if (!Number.isFinite(n)) return "gray";
    const lowerBetter = label.toLowerCase().includes("slop");
    const good = lowerBetter ? n <= 20 : n >= 80;
    const bad = lowerBetter ? n >= 50 : n <= 50;
    return good ? "green" : bad ? "red" : "yellow";
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
    >
      {/* Header: title + verdict badge */}
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="sm" color="nexzy.white">
          Editor report
        </Heading>
        <Badge
          colorPalette={verdictPalette}
          variant="solid"
          textTransform="capitalize"
          px={2.5}
          py={1}
          borderRadius="md"
          fontSize="xs"
        >
          {verdict}
        </Badge>
      </HStack>

      {/* Score chips + games-DB status */}
      {(scoreChips.length > 0 || gameInDb !== null) && (
        <Flex gap={2} mb={4} flexWrap="wrap">
          {scoreChips.map(([label, val]) => {
            const tone = scoreTone(label, val);
            return (
              <Box
                key={label}
                bg={`${tone}.400/10`}
                border="1px solid"
                borderColor={`${tone}.400/25`}
                borderRadius="md"
                px={3}
                py={1.5}
                minW="88px"
              >
                <Text
                  fontSize="10px"
                  color="nexzy.gray.100"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  lineHeight="1.2"
                >
                  {label}
                </Text>
                <Text fontSize="lg" fontWeight="700" color={`${tone}.300`}>
                  {String(val)}
                </Text>
              </Box>
            );
          })}
          {gameInDb !== null && (
            <Flex
              align="center"
              bg={gameInDb ? "green.400/10" : "orange.400/10"}
              border="1px solid"
              borderColor={gameInDb ? "green.400/25" : "orange.400/25"}
              borderRadius="md"
              px={3}
              py={1.5}
            >
              <Text
                fontSize="xs"
                fontWeight="600"
                color={gameInDb ? "green.300" : "orange.300"}
              >
                {gameInDb ? "Game in Nexzy DB ✓" : "Game NOT in DB"}
              </Text>
            </Flex>
          )}
        </Flex>
      )}

      {/* Fact check (news) */}
      {factCheck.length > 0 && (
        <VStack align="stretch" gap={1.5} mb={3}>
          {factCheck.map((f, i) => (
            <Text
              key={i}
              fontSize="xs"
              color={f.supported ? "green.300" : "red.300"}
              lineHeight="1.4"
            >
              {f.supported ? "✓" : "✕"} {f.claim}
            </Text>
          ))}
        </VStack>
      )}

      {/* Flags: suspect specifics + editor notes (side-by-side when wide) */}
      {(suspectClaims.length > 0 || issues.length > 0) && (
        <Box
          display="grid"
          gridTemplateColumns={
            wide && suspectClaims.length > 0 && issues.length > 0
              ? { base: "1fr", lg: "1fr 1fr" }
              : "1fr"
          }
          gap={3}
          mb={3}
        >
          {suspectClaims.length > 0 && (
            <Box
              bg="red.400/8"
              border="1px solid"
              borderColor="red.400/25"
              borderRadius="md"
              p={3}
            >
              <Text fontSize="xs" color="red.200" fontWeight="700" mb={1.5}>
                ⚠ Suspect specifics — verify before publishing
              </Text>
              <VStack align="stretch" gap={1}>
                {suspectClaims.map((c, i) => (
                  <Text key={i} fontSize="xs" color="red.300" lineHeight="1.4">
                    • {c}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}
          {issues.length > 0 && (
            <Box
              bg="orange.400/8"
              border="1px solid"
              borderColor="orange.400/25"
              borderRadius="md"
              p={3}
            >
              <Text fontSize="xs" color="orange.200" fontWeight="700" mb={1.5}>
                Editor notes
              </Text>
              <VStack align="stretch" gap={1}>
                {issues.map((it, i) => (
                  <Text
                    key={i}
                    fontSize="xs"
                    color="orange.300"
                    lineHeight="1.4"
                  >
                    • {it}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}

      {/* Auto-revised diff log */}
      {(autoRevised || revisionLog.length > 0) && (
        <Box mt={4} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
          <Text
            fontSize="xs"
            fontWeight="700"
            color="nexzy.lightBlue"
            mb={2.5}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            ✎ Auto-revised — what the editor changed
          </Text>
          {revisionLog.length === 0 ? (
            <Text fontSize="xs" color="nexzy.gray.100">
              This draft was auto-revised to clear the editor's flags before
              reaching you.
            </Text>
          ) : (
            <Box
              display="grid"
              gridTemplateColumns={
                wide ? { base: "1fr", xl: "1fr 1fr" } : "1fr"
              }
              gap={2.5}
            >
              {revisionLog.map((r, i) => (
                <Box
                  key={i}
                  bg="whiteAlpha.50"
                  borderRadius="md"
                  p={2.5}
                  borderLeft="2px solid"
                  borderColor="nexzy.lightBlue"
                >
                  <HStack align="start" gap={2} mb={1}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="red.300"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      Before
                    </Text>
                    <Text fontSize="xs" color="red.200" lineHeight="1.45">
                      {r.before}
                    </Text>
                  </HStack>
                  <HStack align="start" gap={2} mb={1}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="green.300"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      After
                    </Text>
                    <Text fontSize="xs" color="green.200" lineHeight="1.45">
                      {r.after}
                    </Text>
                  </HStack>
                  <HStack align="start" gap={2}>
                    <Text
                      fontSize="9px"
                      fontWeight="700"
                      color="whiteAlpha.600"
                      textTransform="uppercase"
                      mt="2px"
                      minW="38px"
                    >
                      Why
                    </Text>
                    <Text
                      fontSize="xs"
                      color="nexzy.gray.100"
                      lineHeight="1.45"
                    >
                      {r.why}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
