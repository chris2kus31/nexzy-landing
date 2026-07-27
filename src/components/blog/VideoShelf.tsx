import { Box, HStack } from "@chakra-ui/react";
import type { PublicVideo } from "@/lib/blog/api";
import VideoTile from "@/components/blog/VideoTile";

/** Horizontal, swipeable row of vertical video tiles. Renders nothing empty. */
export default function VideoShelf({
  items,
  from = "shelf",
}: {
  items: PublicVideo[];
  from?: string;
}) {
  if (!items.length) return null;
  return (
    <HStack
      gap={{ base: 4, md: 5 }}
      overflowX="auto"
      align="stretch"
      pb={3}
      css={{
        scrollSnapType: "x mandatory",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { height: "6px" },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.15)",
          borderRadius: "999px",
        },
      }}
    >
      {items.map((v) => (
        <Box
          key={v.slug}
          minW={{ base: "150px", md: "175px" }}
          w={{ base: "150px", md: "175px" }}
          css={{ scrollSnapAlign: "start" }}
        >
          <VideoTile video={v} from={from} />
        </Box>
      ))}
    </HStack>
  );
}
