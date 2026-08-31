import { Box, Text } from "@chakra-ui/react";

/**
 * The author's bylined "take" — their firsthand angle/verdict (the original
 * value a real person adds beyond the reported facts), shown right under the
 * answer capsule. Renders only when present, so it's fully additive: legacy
 * articles and commodity pieces (null) show nothing. A gold accent separates
 * this opinion layer from the blue, factual "short version" above it.
 */
export default function AuthorTake({
  text,
  author,
}: {
  text?: string | null;
  author?: string | null;
}) {
  const t = (text || "").trim();
  if (!t) return null;
  const who = (author || "").trim();
  const label = who ? `${who}'s take` : "Nexzy's take";
  return (
    <Box
      bg="rgba(255,216,102,0.06)"
      borderWidth="1px"
      borderColor="rgba(255,216,102,0.30)"
      borderLeftWidth="4px"
      borderLeftColor="#FFD866"
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
        color="#FFD866"
        fontWeight="700"
        mb={1}
      >
        {label}
      </Text>
      <Text
        fontSize={{ base: "md", md: "lg" }}
        color="gray.100"
        lineHeight="1.6"
        fontWeight="500"
      >
        {t}
      </Text>
    </Box>
  );
}
