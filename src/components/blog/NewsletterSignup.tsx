"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import {
  Box,
  Heading,
  Text,
  Input,
  Button,
  Stack,
  HStack,
} from "@chakra-ui/react";

/**
 * Blog newsletter signup — a dedicated, transparent "weekly gaming digest"
 * opt-in (separate from the app launch-updates form). Posts to the same-origin
 * BFF route which forwards to the newsroom API.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      track("newsletter_signup", { source: "blog" });
      setState("done");
    } catch (err) {
      setState("error");
      setMsg((err as Error)?.message || "Could not subscribe");
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      p={{ base: 6, md: 8 }}
      textAlign="center"
    >
      <Heading as="h2" size="lg" color="white" mb={2}>
        The weekly gaming digest
      </Heading>
      <Text color="gray.300" maxW="lg" mx="auto" mb={5}>
        One email a week with the biggest gaming news — PC, every console,
        hardware, and deals. No spam, unsubscribe anytime.
      </Text>

      {state === "done" ? (
        <Text color="green.300" fontWeight="600">
          You&apos;re in! Check your inbox each week. 🎮
        </Text>
      ) : (
        <form onSubmit={submit}>
          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={3}
            maxW="md"
            mx="auto"
          >
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
              color="white"
              _placeholder={{ color: "gray.500" }}
            />
            <Button
              type="submit"
              colorPalette="blue"
              loading={state === "loading"}
              loadingText="Joining…"
              px={8}
            >
              Subscribe
            </Button>
          </Stack>
          {state === "error" && (
            <Text color="red.300" fontSize="sm" mt={3}>
              {msg}
            </Text>
          )}
          <HStack justify="center" mt={3}>
            <Text color="gray.500" fontSize="xs">
              We only use your email for the weekly digest.
            </Text>
          </HStack>
        </form>
      )}
    </Box>
  );
}
