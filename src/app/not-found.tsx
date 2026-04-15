"use client";

import { Box, Heading, Text, Button } from "@chakra-ui/react";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg="gray.900"
      color="white"
      textAlign="center"
      p={8}
    >
      <Heading size="4xl" mb={4}>
        404
      </Heading>
      <Text fontSize="xl" mb={8} color="gray.400">
        Page not found
      </Text>
      <Link href="/">
        <Button colorScheme="purple" size="lg">
          Go Home
        </Button>
      </Link>
    </Box>
  );
}
