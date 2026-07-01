"use client";

import { use, useEffect, useState } from "react";
import NextLink from "next/link";
import { Box, Container, Heading, Text, Link, Spinner } from "@chakra-ui/react";

type SP = Promise<{ token?: string }>;

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { token } = use(searchParams);
  const [state, setState] = useState<"loading" | "done" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch("/api/blog/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => setState(d?.ok ? "done" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);

  return (
    <Container maxW="lg" py={{ base: 20, md: 28 }} textAlign="center">
      {state === "loading" ? (
        <Spinner color="nexzy.blue" size="lg" />
      ) : state === "done" ? (
        <>
          <Heading size="xl" color="white" mb={3}>
            You&apos;re unsubscribed
          </Heading>
          <Text color="gray.300" mb={6}>
            You won&apos;t receive the weekly gaming digest anymore. Changed
            your mind? You can re-subscribe any time from the news page.
          </Text>
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/blog">← Back to Nexzy News</NextLink>
          </Link>
        </>
      ) : (
        <>
          <Heading size="xl" color="white" mb={3}>
            Link not valid
          </Heading>
          <Text color="gray.300" mb={6}>
            This unsubscribe link is invalid or has already been used.
          </Text>
          <Link asChild color="nexzy.lightBlue">
            <NextLink href="/blog">← Back to Nexzy News</NextLink>
          </Link>
        </>
      )}
    </Container>
  );
}
