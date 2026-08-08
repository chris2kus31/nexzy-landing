import type { Metadata } from "next";
import { Box, Container, Text } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import DayHubView from "@/components/rewind/DayHubView";
import { fetchRewindDay } from "@/lib/blog/api";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rewind — This Day in Gaming",
  description:
    "A daily trip back through gaming history — the launches, consoles, and moments that mattered, on this day.",
  alternates: { canonical: "/rewind" },
};

export default async function RewindIndexPage() {
  const now = new Date();
  const hub = await fetchRewindDay(now.getMonth() + 1, now.getDate());

  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      {hub ? (
        <DayHubView hub={hub} />
      ) : (
        <Container maxW="3xl" py={16}>
          <Text color="nexzy.gray.100">
            The vault is warming up — check back soon.
          </Text>
        </Container>
      )}
      <Footer />
    </Box>
  );
}
