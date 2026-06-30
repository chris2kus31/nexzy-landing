"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flex, Spinner, Text, Button, Box } from "@chakra-ui/react";
import { createSession } from "@/lib/admin/client";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("This link is missing its token.");
      return;
    }
    createSession(token)
      .then(() => router.replace("/admin"))
      .catch((e) =>
        setError(e?.message || "This login link is invalid or expired."),
      );
  }, [params, router]);

  return (
    <Flex minH="100vh" align="center" justify="center" bg="nexzy.navy" px={4}>
      {error ? (
        <Box textAlign="center">
          <Text color="red.300" mb={4}>
            {error}
          </Text>
          <Button
            onClick={() => router.replace("/admin/login")}
            bg="nexzy.yellow"
            color="nexzy.navy"
            borderRadius="lg"
            fontWeight="600"
          >
            Back to sign in
          </Button>
        </Box>
      ) : (
        <Flex direction="column" align="center" gap={4}>
          <Spinner color="nexzy.blue" size="lg" />
          <Text color="nexzy.gray.100">Signing you in…</Text>
        </Flex>
      )}
    </Flex>
  );
}

export default function AdminCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}
