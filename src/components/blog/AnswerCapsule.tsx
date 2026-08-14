import { Box, Text } from "@chakra-ui/react";

/**
 * The answer-first lede ("the short version") — the direct answer/most important
 * fact, stated up top. Serves triple duty: the AI-extractable snippet, the
 * featured-snippet target, and the reader's "just tell me the thing." Renders
 * only when the writer produced one; legacy articles (null) show nothing, so
 * this is fully additive.
 */
export default function AnswerCapsule({ text }: { text?: string | null }) {
  const t = (text || "").trim();
  if (!t) return null;
  return (
    <Box
      bg="rgba(0,123,255,0.08)"
      borderWidth="1px"
      borderColor="rgba(77,163,255,0.35)"
      borderLeftWidth="4px"
      borderLeftColor="nexzy.blue"
      borderRadius="xl"
      px={5}
      py={4}
      mb={6}
    >
      <Text
        fontFamily="title"
        fontSize="xs"
        letterSpacing="0.09em"
        textTransform="uppercase"
        color="nexzy.lightBlue"
        fontWeight="700"
        mb={1}
      >
        The short version
      </Text>
      <Text
        fontSize={{ base: "md", md: "lg" }}
        color="gray.100"
        lineHeight="1.55"
        fontWeight="500"
      >
        {t}
      </Text>
    </Box>
  );
}
