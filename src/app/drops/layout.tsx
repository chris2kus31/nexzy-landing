import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";
import { D } from "@/components/drops/tokens";

// Same site chrome as /games: the nav bar, then the page.
export default function DropsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box bg={D.base} minH="100vh" color={D.white}>
      <Navigation />
      <Box pt={16}>{children}</Box>
    </Box>
  );
}
