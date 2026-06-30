"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  Stack,
} from "@chakra-ui/react";
import { requestMagicLink } from "@/lib/admin/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestMagicLink(email);
      setSent(true);
    } catch {
      // Intentionally generic — no account enumeration.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="nexzy.navy" px={4}>
      <Box
        w="full"
        maxW="sm"
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="2xl"
        p={8}
      >
        <Heading size="lg" color="nexzy.white" mb={1}>
          Nexzy Newsroom
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm" mb={6}>
          Editorial admin — sign in with your email.
        </Text>

        {sent ? (
          <Box
            bg="nexzy.blue/15"
            border="1px solid"
            borderColor="nexzy.lightBlue/30"
            borderRadius="lg"
            p={4}
          >
            <Text color="nexzy.white" fontSize="sm">
              If that email is on the allowlist, a one-time sign-in link is on
              its way. Check your inbox and click the link to continue.
            </Text>
          </Box>
        ) : (
          <Box as="form" onSubmit={onSubmit}>
            <Stack gap={3}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@email.com"
                aria-label="Email address"
                size="lg"
                bg="white"
                color="nexzy.navy"
                borderRadius="lg"
                _placeholder={{ color: "gray.400" }}
              />
              {error && (
                <Text fontSize="xs" color="red.300">
                  {error}
                </Text>
              )}
              <Button
                type="submit"
                size="lg"
                bg="nexzy.yellow"
                color="nexzy.navy"
                borderRadius="lg"
                fontWeight="600"
                loading={loading}
                _hover={{ bg: "nexzy.gold" }}
              >
                Send sign-in link
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
