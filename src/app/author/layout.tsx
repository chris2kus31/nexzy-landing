import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";

// Author pages live outside the /blog route group, so they need the same dark
// newsroom chrome (navy background + nav) or they'd render on the plain global
// background and look broken (white-on-white).
export default function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box bg="nexzy.navy" minH="100vh">
      <Navigation />
      <Box pt={16}>{children}</Box>
    </Box>
  );
}
