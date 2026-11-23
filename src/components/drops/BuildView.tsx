// One build's page (a posted entry or a saved web build): the share image,
// "Do you match? Make yours", a line of social proof, then "Inside their 9"
// (each pick with the newest Nexzy piece about it) and the app pitch.
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
import AppPitch from "@/components/drops/AppPitch";
import GameStories from "@/components/drops/GameStories";
import { D } from "@/components/drops/tokens";
import {
  dropPath,
  type BuildPick,
  type GameStory,
  type TrendView,
} from "@/lib/trends/types";

export default function BuildView({
  drop,
  heading,
  image,
  picks,
  stories,
  proof,
  location,
}: {
  drop: TrendView;
  heading: string;
  image: string | null;
  picks: BuildPick[];
  /** The newest Nexzy piece per picked game (missing = nothing recent). */
  stories: Record<string, GameStory>;
  /** "312 players share 5+ of these picks" (+ hearts once it has any). */
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
              // The page's main image (its largest paint): load it first and
              // reserve its 4:5 box so nothing jumps when it arrives.
              <Image
                src={image}
                alt={heading}
                w="100%"
                h="auto"
                aspectRatio="4 / 5"
                objectFit="contain"
                fetchPriority="high"
                decoding="async"
              />
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
          {proof && (
            <Box fontSize="sm" color={D.muted}>
              {proof}
            </Box>
          )}
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
          {picks.length > 0 && (
            <Box mt={2}>
              <GameStories picks={picks} stories={stories} />
            </Box>
          )}
          <AppPitch location={location} />
        </Stack>
      </Flex>
    </Container>
  );
}
