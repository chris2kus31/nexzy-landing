import { Box, Flex, Heading, Link, Separator, Text } from "@chakra-ui/react";

/**
 * Collapsible Sources footer for article pages. Big stories can carry 50+
 * source links — rendered flat they made articles endlessly scrollable, so the
 * list is collapsed behind a "Sources (N)" toggle and expands into compact
 * wrapping chips instead of one link per line.
 *
 * Native <details>/<summary> (no client JS): works in server components, and
 * the links stay in the DOM for crawlers/attribution even while collapsed.
 */
export default function SourcesBlock({
  sources,
}: {
  sources: { name: string; url: string }[] | null | undefined;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <Box mt={10}>
      <Separator borderColor="whiteAlpha.200" mb={4} />
      <Box as="details">
        <Box
          as="summary"
          cursor="pointer"
          listStyleType="none"
          css={{
            "&::-webkit-details-marker": { display: "none" },
            "&::marker": { display: "none", content: '""' },
          }}
          _hover={{ opacity: 0.85 }}
        >
          <Flex align="center" gap={2} display="inline-flex">
            <Heading as="h2" size="sm" color="gray.300">
              Sources ({sources.length})
            </Heading>
            <Text as="span" color="gray.400" fontSize="xs">
              ▾ tap to expand
            </Text>
          </Flex>
        </Box>
        <Flex wrap="wrap" gap={2} mt={3}>
          {sources.map((s, i) => (
            <Link
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              color="nexzy.lightBlue"
              fontSize="xs"
              px={2.5}
              py={1}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="full"
              bg="whiteAlpha.50"
              _hover={{ bg: "whiteAlpha.100", textDecoration: "none" }}
            >
              {s.name}
            </Link>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
