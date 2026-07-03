import { Box, Grid, GridItem } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";
import FeaturedCard from "@/components/blog/FeaturedCard";
import TrendingRail from "@/components/blog/TrendingRail";

/**
 * Front-page hero: the top story as a large visual card on the left, with a
 * tabbed popularity rail (🔥 Trending / Most read) on the right. Server-rendered
 * shell; the rail itself is a client component so tab switching is instant.
 *
 * The rail shows the TRUE ranking (it does not hide the hero story) — on a small
 * blog the hero is often the most-read piece, so excluding it made the real #1
 * look missing. A little overlap between the hero and the list is expected.
 */
export default function NewsroomHero({
  featured,
  hot,
  reads,
}: {
  featured: PublicPost;
  hot: PublicPost[];
  reads: PublicPost[];
}) {
  return (
    <Box mb={{ base: 10, md: 12 }}>
      <Grid
        templateColumns={{ base: "1fr", lg: "1.6fr 1fr" }}
        gap={{ base: 6, lg: 6 }}
        alignItems="stretch"
      >
        <GridItem minW={0}>
          <FeaturedCard post={featured} />
        </GridItem>
        <GridItem minW={0}>
          <TrendingRail hot={hot} reads={reads} />
        </GridItem>
      </Grid>
    </Box>
  );
}
