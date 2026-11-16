import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";

// Same site chrome as /games: the nav bar, then the page.
export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box bg="#151935" minH="100vh">
      <Navigation />
      <Box pt={16}>{children}</Box>
    </Box>
  );
}
