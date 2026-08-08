import { Box, Flex, Text } from "@chakra-ui/react";
import { monthName } from "@/lib/rewind/era";

// A real, era-appropriate target for the Wayback calendar. GameSpot has been
// continuously archived since 1996, so "the web as it was that week" resolves to
// a genuine snapshot. The web (and the archive) barely exists before 1996, so
// the card hides itself for older years rather than link to an empty page.
const ARCHIVE_SITE = "https://www.gamespot.com";

/**
 * "From the Vault" — the mockup's Wayback card, built automatically (no per-
 * episode data). A cream browser-chrome frame stamped with the month/year links
 * to the Wayback Machine's snapshot of the gaming web from that week. Cream
 * "artifact" styling + era accent so it reads as a pulled-from-the-past object.
 */
export default function FromTheVault({
  month,
  day,
  year,
  accent,
}: {
  month: number;
  day: number;
  year: number | null;
  accent: string;
}) {
  if (!year || year < 1996) return null;

  const stamp = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const href = `https://web.archive.org/web/${stamp}120000/${ARCHIVE_SITE}`;
  const label = `${monthName(month).slice(0, 3).toLowerCase()} ${year}`;

  return (
    <Box mt={12}>
      <Text
        fontFamily="mono"
        fontSize="xs"
        letterSpacing="0.15em"
        color="nexzy.gray.100"
        mb={3}
      >
        FROM THE VAULT
      </Text>

      <Box
        bg="#efe7d3"
        borderRadius="xl"
        p={{ base: 4, md: 5 }}
        boxShadow="0 16px 34px rgba(0,0,0,.35)"
      >
        <Flex direction={{ base: "column", md: "row" }} gap={5} align="center">
          {/* Faux archived-browser window */}
          <Box
            flex="0 0 auto"
            w={{ base: "100%", md: "270px" }}
            border="1px solid #cbb98f"
            borderRadius="md"
            overflow="hidden"
            bg="#fbf7ec"
          >
            <Flex
              align="center"
              gap={2}
              bg="#e3d7ba"
              px={3}
              py="6px"
              borderBottom="1px solid #cbb98f"
            >
              <Box w="8px" h="8px" borderRadius="full" bg="#d98b4a" />
              <Box w="8px" h="8px" borderRadius="full" bg="#c9a24a" />
              <Text
                fontFamily="mono"
                fontSize="10px"
                color="#6b5b45"
                ml={1}
                truncate
              >
                web.archive.org · {label}
              </Text>
            </Flex>
            <Box p={3}>
              <Box h="10px" w="60%" bg="#d9cba7" borderRadius="2px" mb="7px" />
              <Box h="8px" w="90%" bg="#e2d6b8" borderRadius="2px" mb="6px" />
              <Box h="8px" w="80%" bg="#e2d6b8" borderRadius="2px" mb="10px" />
              <Flex align="center" gap={2}>
                <Box
                  px={2}
                  py="3px"
                  bg={accent}
                  color="#1a1206"
                  fontFamily="mono"
                  fontSize="9px"
                  fontWeight="800"
                  borderRadius="2px"
                >
                  {year}
                </Box>
                <Box h="8px" flex="1" bg="#e2d6b8" borderRadius="2px" />
              </Flex>
            </Box>
          </Box>

          <Box flex="1" textAlign={{ base: "center", md: "left" }}>
            <Text color="#3a2f22" fontSize="sm" mb={3} lineHeight="1.6">
              Step back into the browser window: the gaming web as it actually
              looked around {monthName(month)} {year}, pulled live from the
              Wayback Machine.
            </Text>
            <a href={href} target="_blank" rel="noopener noreferrer">
              <Text
                as="span"
                color="#b23a1e"
                fontWeight="700"
                fontSize="sm"
                _hover={{ textDecoration: "underline" }}
              >
                Rewind the web to {year} ▸
              </Text>
            </a>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
