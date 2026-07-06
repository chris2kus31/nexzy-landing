"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  Heading,
  Text,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { getMe, signOut, AuthError } from "@/lib/admin/client";

/**
 * Wraps every protected admin page: checks the session (redirects to /login on
 * 401) and renders the header with the signed-in email + sign-out.
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getMe()
      .then((m) => setEmail(m.email))
      .catch((e) => {
        if (e instanceof AuthError) router.replace("/admin/login");
      })
      .finally(() => setChecking(false));
  }, [router]);

  const onSignOut = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  if (checking) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="nexzy.navy">
        <Spinner color="nexzy.blue" size="lg" />
      </Flex>
    );
  }

  if (!email) return null; // redirecting

  return (
    <Box minH="100vh" bg="nexzy.navy" overflowX="hidden">
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={{ base: 4, md: 8 }}
        py={4}
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        position="sticky"
        top={0}
        bg="nexzy.navy"
        zIndex={10}
      >
        <NextLink href="/admin">
          <Heading size="md" color="nexzy.white">
            Nexzy Newsroom
          </Heading>
        </NextLink>
        <HStack gap={4}>
          <Text
            color="nexzy.gray.100"
            fontSize="sm"
            display={{ base: "none", sm: "block" }}
          >
            {email}
          </Text>
          <Button
            onClick={onSignOut}
            size="sm"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Sign out
          </Button>
        </HStack>
      </Flex>
      <Box px={{ base: 4, md: 8 }} py={6} maxW="6xl" mx="auto" minW={0}>
        {children}
      </Box>
    </Box>
  );
}
