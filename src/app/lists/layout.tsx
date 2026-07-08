import { Box } from "@chakra-ui/react";
import Navigation from "@/components/landing/Navigation";

export default function ListsLayout({
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
