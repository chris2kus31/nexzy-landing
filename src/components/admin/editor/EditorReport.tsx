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

/** Friendly labels for the format-gate module keys (see beat-formats.ts). */
const MODULE_LABELS: Record<string, string> = {
  answerCapsule: "Short version",
  body: "Body",
  poll: "Poll",
  whyItMatters: "Why it matters",
  details: "The details",
  hardwareSpec: "Spec table",
  whoFor: "Who it's for",
  essentials: "Essentials",
  deal: "Deal + store link",
  patch: "Patch changes",
  verdict: "Verdict",
  prosCons: "Pros / cons",
  whoForReview: "Buy / wait / skip",
  leadVideo: "Lead video",
  hero: "Hero",
};

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
  // The REAL gate outcome (set by the news editor): the LLM verdict is only its
  // opinion of the copy, so we show gateResult as the primary badge and demote
  // the verdict to a secondary chip. Absent on guides → fall back to verdict.
  const gateResult =
    typeof report.gateResult === "string" ? report.gateResult : null;
  const gateMeta: Record<string, { label: string; palette: string }> = {
    pass: { label: "Passed gate", palette: "green" },
    held: { label: "Held for review", palette: "orange" },
    forced: { label: "Forced to review", palette: "blue" },
  };
  const gate = gateResult ? (gateMeta[gateResult] ?? null) : null;
  const uniquenessNotes = Array.isArray(report.uniquenessNotes)
    ? (report.uniquenessNotes as string[])
    : [];
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
  const formatChecklist = Array.isArray(report.formatChecklist)
    ? (report.formatChecklist as { module: string; status: string }[])
    : [];
  // Phase 3 — original-value gate + index recommendation (advisory).
  const originalValue = (report.originalValue ?? null) as {
    takeExpected: boolean;
    takePresent: boolean;
    takeSubstantive: boolean;
    qcFlags: string[];
    indexRecommendation: "index" | "noindex";
  } | null;

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
    : ([
        ...(report.styleScore != null ? [["Style", report.styleScore]] : []),
        ...(report.uniquenessScore != null
          ? [["Info gain", report.uniquenessScore]]
          : []),
      ] as [string, unknown][]);

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
      {/* Header: title + gate-result badge (real outcome). The LLM verdict is
          shown as a smaller secondary chip so it can't be mistaken for the
          gate. Guides have no gateResult → the verdict is the primary badge. */}
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="sm" color="nexzy.white">
          Editor report
        </Heading>
        <HStack gap={2}>
          {gate && (
            <Badge
              colorPalette="gray"
              variant="subtle"
              textTransform="capitalize"
              px={2}
              py={1}
              borderRadius="md"
              fontSize="10px"
              title="The AI editor's opinion of the copy — not the gate result"
            >
              AI: {verdict}
            </Badge>
          )}
          <Badge
            colorPalette={gate ? gate.palette : verdictPalette}
            variant="solid"
            textTransform="capitalize"
            px={2.5}
            py={1}
            borderRadius="md"
            fontSize="xs"
          >
            {gate ? gate.label : verdict}
          </Badge>
        </HStack>
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

      {/* Format checklist — the beat's required modules. Missing = holds for you
          to fill; manual = no auto-check yet, verify by eye. */}
      {formatChecklist.length > 0 && (
        <Box mb={4}>
          <Text
            fontSize="10px"
            color="nexzy.gray.100"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={1.5}
          >
            Format checklist
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {formatChecklist.map((f) => {
              const tone =
                f.status === "present"
                  ? "green"
                  : f.status === "missing"
                    ? "red"
                    : "gray";
              const icon =
                f.status === "present"
                  ? "✓"
                  : f.status === "missing"
                    ? "✕"
                    : "•";
              return (
                <Box
                  key={f.module}
                  bg={`${tone}.400/10`}
                  border="1px solid"
                  borderColor={`${tone}.400/25`}
                  borderRadius="md"
                  px={2.5}
                  py={1}
                >
                  <Text fontSize="xs" color={`${tone}.300`} fontWeight="600">
                    {icon} {MODULE_LABELS[f.module] ?? f.module}
                  </Text>
                </Box>
              );
            })}
          </Flex>
        </Box>
      )}

      {/* Original value + index recommendation (Phase 3, advisory) */}
      {originalValue && (
        <Box mb={4}>
          <Text
            fontSize="10px"
            color="nexzy.gray.100"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={1.5}
          >
            Original value + index
          </Text>
          <Flex
            gap={2}
            flexWrap="wrap"
            mb={originalValue.qcFlags.length ? 2 : 0}
          >
            {(originalValue.takeExpected || originalValue.takePresent) && (
              <Box
                bg={`${originalValue.takePresent ? "green" : "red"}.400/10`}
                border="1px solid"
                borderColor={`${originalValue.takePresent ? "green" : "red"}.400/25`}
                borderRadius="md"
                px={2.5}
                py={1}
              >
                <Text
                  fontSize="xs"
                  color={`${originalValue.takePresent ? "green" : "red"}.300`}
                  fontWeight="600"
                >
                  {originalValue.takePresent ? "✓" : "✕"} Take present
                </Text>
              </Box>
            )}
            {originalValue.takePresent && (
              <Box
                bg={`${originalValue.takeSubstantive ? "green" : "orange"}.400/10`}
                border="1px solid"
                borderColor={`${originalValue.takeSubstantive ? "green" : "orange"}.400/25`}
                borderRadius="md"
                px={2.5}
                py={1}
              >
                <Text
                  fontSize="xs"
                  color={`${originalValue.takeSubstantive ? "green" : "orange"}.300`}
                  fontWeight="600"
                >
                  {originalValue.takeSubstantive ? "✓" : "•"} Substantive
                </Text>
              </Box>
            )}
            <Box
              bg={`${originalValue.indexRecommendation === "index" ? "green" : "gray"}.400/10`}
              border="1px solid"
              borderColor={`${originalValue.indexRecommendation === "index" ? "green" : "gray"}.400/25`}
              borderRadius="md"
              px={2.5}
              py={1}
            >
              <Text
                fontSize="xs"
                color={`${originalValue.indexRecommendation === "index" ? "green" : "gray"}.300`}
                fontWeight="600"
                textTransform="capitalize"
              >
                Recommend: {originalValue.indexRecommendation}
              </Text>
            </Box>
          </Flex>
          {originalValue.qcFlags.length > 0 && (
            <VStack align="stretch" gap={1}>
              {originalValue.qcFlags.map((q, i) => (
                <Text key={i} fontSize="xs" color="red.300" lineHeight="1.4">
                  ⚠ {q}
                </Text>
              ))}
            </VStack>
          )}
        </Box>
      )}

      {/* Information gain (SEO original value) — what the piece uniquely adds,
          or (when the score is low) what to add to make it worth indexing. */}
      {uniquenessNotes.length > 0 && (
        <Box mb={4}>
          <Text
            fontSize="10px"
            color="nexzy.gray.100"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={1.5}
          >
            Information gain
          </Text>
          <VStack align="stretch" gap={1}>
            {uniquenessNotes.map((n, i) => (
              <Text
                key={i}
                fontSize="xs"
                color="nexzy.gray.100"
                lineHeight="1.45"
              >
                • {n}
              </Text>
            ))}
          </VStack>
        </Box>
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
