// ============================================
// FILE: components/landing/EmailCapture.tsx
// Reusable newsletter email capture (gaming tips, deals + bonus coins).
// Posts to /api/subscribe (Next.js route handler).
// ============================================
"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  HStack,
  Input,
  Button,
  Text,
  Icon,
} from "@chakra-ui/react";
import { HiSparkles } from "react-icons/hi";
import { IoCheckmarkCircle } from "react-icons/io5";
import { track } from "@/lib/analytics";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailCapture({
  variant = "hero",
  source = "landing",
}: {
  variant?: "hero" | "cta";
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error("Request failed");
      track("newsletter_signup", { source });
      setStatus("success");
      setMessage(
        "You're in! Gaming news, guides, and deals — straight to your inbox. 🎮",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const onCta = variant === "cta";

  if (status === "success") {
    return (
      <HStack
        gap={3}
        bg="nexzy.blue/20"
        border="1px solid"
        borderColor="nexzy.lightBlue/30"
        borderRadius="full"
        px={6}
        py={3}
      >
        <Icon color="nexzy.yellow" boxSize={5}>
          <IoCheckmarkCircle />
        </Icon>
        <Text color="nexzy.white" fontSize="sm" fontWeight="medium">
          {message}
        </Text>
      </HStack>
    );
  }

  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      w="full"
      maxW={{ base: "full", sm: onCta ? "lg" : "md" }}
    >
      <Stack gap={2}>
        <HStack gap={2} justify={onCta ? "center" : "flex-start"}>
          <Icon color="nexzy.yellow" boxSize={4}>
            <HiSparkles />
          </Icon>
          <Text fontSize="sm" fontWeight="medium" color="nexzy.white">
            Get gaming news, guides, and deals in your inbox
          </Text>
        </HStack>
        <Stack direction={{ base: "column", sm: "row" }} gap={3} w="full">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="you@email.com"
            aria-label="Email address"
            size="lg"
            bg="white"
            color="nexzy.navy"
            borderRadius="full"
            px={6}
            _placeholder={{ color: "gray.400" }}
            flex={1}
          />
          <Button
            type="submit"
            size="lg"
            bg="nexzy.yellow"
            color="nexzy.navy"
            borderRadius="full"
            px={8}
            fontWeight="600"
            loading={status === "loading"}
            _hover={{ bg: "nexzy.gold", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            Sign Up
          </Button>
        </Stack>
        {status === "error" && (
          <Text fontSize="xs" color="red.300">
            {message}
          </Text>
        )}
        <Text fontSize="xs" color="nexzy.gray.100" opacity={0.8}>
          No spam. Unsubscribe anytime.
        </Text>
      </Stack>
    </Box>
  );
}
