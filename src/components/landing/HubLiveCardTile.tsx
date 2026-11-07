// ============================================
// FILE: components/landing/HubLiveCardTile.tsx
// A live mega hub as a card in the home guides rail (gold "Mega hub" badge,
// gold border so it reads as the flagship guide). Same size as BlogCard.
// ============================================
import NextLink from "next/link";
import { Badge, Box, Heading, Text } from "@chakra-ui/react";
import { hubParts, type HubLiveCard } from "@/lib/hub-engine/types";

export default function HubLiveCardTile({ hub }: { hub: HubLiveCard }) {
  const parts = hubParts(hub, 3);
  return (
    <NextLink
      href={`/games/${hub.slug}#guide`}
      style={{ display: "block", height: "100%" }}
    >
      <Box
        className="group"
        bg="whiteAlpha.50"
        border="2px solid"
        borderColor="nexzy.gold"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
        h="full"
        display="flex"
        flexDirection="column"
      >
        <Box
          position="relative"
          overflow="hidden"
          w="full"
          aspectRatio={16 / 9}
        >
          {hub.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hub.image}
              alt={hub.name}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Box position="absolute" inset={0} bg="nexzy.blue/10" />
          )}
          <Badge
            position="absolute"
            top={3}
            left={3}
            bg="nexzy.gold"
            color="nexzy.navy"
            fontWeight="800"
            size="sm"
          >
            Mega hub
          </Badge>
        </Box>
        <Box p={5} flex={1} display="flex" flexDirection="column" gap={2}>
          <Heading as="h3" size="md" color="white" lineClamp={2}>
            {hub.name}: the complete guide
          </Heading>
          {parts.length > 0 && (
            <Text color="gray.300" fontSize="sm" lineClamp={2}>
              {parts.join(" · ")}
            </Text>
          )}
          <Text color="nexzy.gold" fontWeight="800" fontSize="sm" mt="auto">
            Open the guide →
          </Text>
        </Box>
      </Box>
    </NextLink>
  );
}
