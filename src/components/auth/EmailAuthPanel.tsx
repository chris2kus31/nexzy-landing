"use client";

import { useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { useAuth } from "./AuthProvider";
import { getWebDeviceId } from "@/lib/auth/config";

type Mode = "signin" | "signup" | "verify";

/**
 * Email + password sign-in / sign-up with email-OTP verification. Same account
 * system as the mobile app (nexzy-api /auth/register, /otp/verify, /auth/login).
 * Env-gated by NEXT_PUBLIC_EMAIL_AUTH_ENABLED — social sign-in is the default.
 */
export default function EmailAuthPanel({ onDone }: { onDone?: () => void }) {
  const { applySession } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  function errFrom(data: any, fallback: string): string {
    const m = data?.message;
    if (Array.isArray(m)) return m[0];
    return m || data?.error || fallback;
  }

  async function signin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceId: getWebDeviceId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errFrom(data, "Invalid email or password."));
        return;
      }
      applySession(data.user);
      onDone?.();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword: password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errFrom(data, "Couldn't create your account."));
        return;
      }
      setPendingUserId(data.user?.id ?? null);
      setNotice(
        data.otpSent === false
          ? "Account created. Tap Resend to get your code."
          : "We emailed you a 6-digit code.",
      );
      setMode("verify");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!pendingUserId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingUserId,
          otpCode: code.trim(),
          deviceId: getWebDeviceId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errFrom(data, "That code didn't work."));
        return;
      }
      applySession(data.user);
      onDone?.();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pendingUserId) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId }),
      });
      setNotice(
        res.ok ? "A new code is on its way." : "Couldn't resend — try again.",
      );
    } catch {
      setNotice("Couldn't resend — try again.");
    }
  }

  const inputProps = {
    bg: "whiteAlpha.100",
    border: "1px solid",
    borderColor: "whiteAlpha.300",
    color: "white",
    _placeholder: { color: "whiteAlpha.500" },
    size: "sm" as const,
  };

  return (
    <Box mt={2} w="100%" maxW="300px" mx="auto">
      {mode === "signup" ? (
        <Flex direction="column" gap={2}>
          <Flex gap={2}>
            <Input
              {...inputProps}
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              {...inputProps}
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Flex>
          <Input
            {...inputProps}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            {...inputProps}
            type="password"
            placeholder="Password (10+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            onClick={signup}
            loading={busy}
            colorPalette="blue"
            size="sm"
            mt={1}
          >
            Create account
          </Button>
          <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
            Have an account?{" "}
            <Box
              as="button"
              color="blue.300"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Sign in
            </Box>
          </Text>
        </Flex>
      ) : mode === "verify" ? (
        <Flex direction="column" gap={2}>
          <Input
            {...inputProps}
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button onClick={verify} loading={busy} colorPalette="blue" size="sm">
            Verify &amp; sign in
          </Button>
          <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
            Didn&rsquo;t get it?{" "}
            <Box as="button" color="blue.300" onClick={resend}>
              Resend code
            </Box>
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap={2}>
          <Input
            {...inputProps}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            {...inputProps}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            onClick={signin}
            loading={busy}
            colorPalette="blue"
            size="sm"
            mt={1}
          >
            Sign in
          </Button>
          <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
            New here?{" "}
            <Box
              as="button"
              color="blue.300"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Create an account
            </Box>
          </Text>
        </Flex>
      )}

      {notice ? (
        <Text mt={2} fontSize="xs" color="whiteAlpha.700" textAlign="center">
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text mt={2} fontSize="xs" color="red.400" textAlign="center">
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
