// One build's page (a posted entry or a saved web build): the share image,
// the picks in order (each linked to its game page when the site has one),
// a line of social proof, and "Do you match? Make yours".
import NextLink from "next/link";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";
import CoverTile from "@/components/drops/CoverTile";
import StoreButtons from "@/components/drops/StoreButtons";
import { D } from "@/components/drops/tokens";
import {
  dropPath,
  gameHref,
  type BuildPick,
  type TrendView,
} from "@/lib/trends/types";

export default function BuildView({
  drop,
  heading,
  image,
  picks,
  proof,
  location,
}: {
  drop: TrendView;
  heading: string;
  image: string | null;
  picks: BuildPick[];
  /** "312 players share 5+ of these picks" / "48 hearts on Nexzy". */
  proof: React.ReactNode;
  location: string;
}) {
  return (
    <Container maxW="1100px" py={{ base: 6, md: 12 }} px={{ base: 4, md: 10 }}>
      <Flex gap={{ base: 6, md: 12 }} wrap="wrap" align="flex-start">
        <Box flex="1 1 340px" minW={0} maxW="500px" mx="auto">
          <Box
            borderRadius="16px"
            overflow="hidden"
            border="1px solid"
            borderColor={D.line}
            bg={D.panel}
          >
            {image ? (
              <Image src={image} alt={heading} w="100%" h="auto" />
            ) : (
              <Box p={{ base: 4, md: 5 }}>
                <Text
                  fontFamily="title"
                  fontWeight="700"
                  fontSize="3xl"
                  color={D.yellow}
                  lineHeight="1"
                >
                  #{drop.hashtag}
                </Text>
                <Text fontWeight="700" mt={1} mb={4}>
                  {drop.title}
                </Text>
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(3, minmax(0, 1fr))"
                  gap={2}
                >
                  {picks.map((p) => (
                    <CoverTile
                      key={p.id}
                      cover={p.cover}
                      name={p.name}
                      badge={p.badge}
                      showName
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <Stack flex="1 1 380px" minW={0} gap={4}>
          <NextLink
            href={dropPath(drop.slug)}
            style={{ color: D.yellow, fontWeight: 700, fontSize: 14 }}
          >
            #{drop.hashtag} on Nexzy Drops
          </NextLink>
          <Heading
            as="h1"
            fontFamily="title"
            fontWeight="700"
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight="1.02"
          >
            {heading}
          </Heading>
          <Text color={D.dim} fontSize="lg">
            {drop.title}
          </Text>
          <Stack as="ol" gap={2.5} listStyleType="none" m={0} p={0}>
            {picks.map((p, i) => {
              const href = gameHref(p);
              return (
                <Flex as="li" key={p.id} gap={3} align="center">
                  <Flex
                    w="26px"
                    h="26px"
                    flexShrink={0}
                    borderRadius="7px"
                    bg={D.yellow}
                    color={D.base}
                    fontFamily="title"
                    fontWeight="700"
                    fontSize="sm"
                    align="center"
                    justify="center"
                  >
                    {p.badge ?? i + 1}
                  </Flex>
                  <Box w="30px" flexShrink={0}>
                    <CoverTile cover={p.cover} radius="4px" />
                  </Box>
                  <Box minW={0}>
                    <Text fontWeight="700">
                      {href ? (
                        <NextLink
                          href={href}
                          style={{
                            textDecoration: "underline",
                            textUnderlineOffset: 3,
                          }}
                        >
                          {p.name}
                        </NextLink>
                      ) : (
                        p.name
                      )}
                    </Text>
                    {p.reason && (
                      <Text fontSize="sm" color={D.muted}>
                        {p.reason}
                      </Text>
                    )}
                  </Box>
                </Flex>
              );
            })}
          </Stack>
          <Box fontSize="sm" color={D.muted}>
            {proof}
          </Box>
          {drop.joinable && (
            <Button
              asChild
              h="52px"
              borderRadius="14px"
              bg={D.yellow}
              color={D.base}
              fontWeight="900"
              fontSize="md"
              alignSelf="flex-start"
              px={6}
              _hover={{ opacity: 0.92 }}
            >
              <NextLink href={`${dropPath(drop.slug)}#make`}>
                Do you match? Make yours
              </NextLink>
            </Button>
          )}
          <Box
            mt={2}
            p={5}
            borderRadius="18px"
            border="1px solid rgba(110,139,255,0.45)"
            bg="linear-gradient(135deg, rgba(59,107,255,0.20), rgba(26,31,71,0.7))"
          >
            <Text fontFamily="title" fontWeight="700" fontSize="xl">
              See who matches you
            </Text>
            <Text color={D.dim} fontSize="sm" mt={1} mb={4}>
              Compare picks, follow the players who match you and start a Squad
              Room in the Nexzy app.
            </Text>
            <StoreButtons location={location} />
          </Box>
        </Stack>
      </Flex>
    </Container>
  );
}
