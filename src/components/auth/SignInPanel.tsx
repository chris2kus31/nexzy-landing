"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useAuth } from "./AuthProvider";
import {
  GOOGLE_WEB_CLIENT_ID,
  APPLE_SERVICES_ID,
  APPLE_REDIRECT_URI,
  EMAIL_AUTH_ENABLED,
  getWebDeviceId,
} from "@/lib/auth/config";
import EmailAuthPanel from "./EmailAuthPanel";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const APPLE_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

/**
 * Google + Apple web sign-in. Both resolve to the SAME nexzy-api account as the
 * mobile app (Google project + Apple team are shared). On success the token
 * exchange happens server-side via /api/auth/* and the session lands in httpOnly
 * cookies; we just hand the resulting user to the AuthProvider.
 */
export default function SignInPanel({ onDone }: { onDone?: () => void }) {
  const { applySession } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  async function postSession(path: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, deviceId: getWebDeviceId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "We couldn't sign you in. Please try again.");
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

  // Google Identity Services — render the official button.
  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_WEB_CLIENT_ID) return;
    loadScript(GIS_SRC, "gis-script")
      .then(() => {
        if (cancelled || !window.google || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          ux_mode: "popup",
          callback: (resp: any) => {
            if (resp?.credential)
              postSession("/api/auth/google", { idToken: resp.credential });
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 260,
        });
      })
      .catch(() => setError("Google sign-in failed to load."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign in with Apple JS.
  useEffect(() => {
    if (!APPLE_SERVICES_ID) return;
    loadScript(APPLE_SRC, "apple-script")
      .then(() => {
        if (!window.AppleID) return;
        window.AppleID.auth.init({
          clientId: APPLE_SERVICES_ID,
          scope: "name email",
          redirectURI: APPLE_REDIRECT_URI,
          usePopup: true,
        });
      })
      .catch(() => {});
  }, []);

  async function handleApple() {
    if (!window.AppleID) {
      setError("Apple sign-in isn't ready yet — try again in a moment.");
      return;
    }
    try {
      const data = await window.AppleID.auth.signIn();
      const identityToken = data?.authorization?.id_token;
      if (!identityToken) {
        setError("Apple didn't return a token. Please try again.");
        return;
      }
      await postSession("/api/auth/apple", {
        identityToken,
        firstName: data?.user?.name?.firstName,
        lastName: data?.user?.name?.lastName,
      });
    } catch (e: any) {
      // User closing the Apple popup throws — treat as a silent cancel.
      if (
        e?.error !== "popup_closed_by_user" &&
        e?.error !== "user_cancelled_authorize"
      )
        setError("Apple sign-in was cancelled or failed.");
    }
  }

  return (
    <Box>
      <Flex direction="column" gap={3} align="center">
        {GOOGLE_WEB_CLIENT_ID ? <Box ref={googleBtnRef} minH="40px" /> : null}

        {APPLE_SERVICES_ID ? (
          <Button
            onClick={handleApple}
            loading={busy}
            bg="black"
            color="white"
            borderRadius="full"
            w="260px"
            h="40px"
            fontSize="sm"
            fontWeight="600"
            _hover={{ bg: "#111" }}
          >
            Continue with Apple
          </Button>
        ) : null}
      </Flex>

      {EMAIL_AUTH_ENABLED ? (
        <Box mt={4}>
          {showEmail ? (
            <EmailAuthPanel onDone={onDone} />
          ) : (
            <Flex direction="column" align="center" gap={2}>
              <Flex align="center" w="260px" gap={3} opacity={0.5}>
                <Box h="1px" flex="1" bg="whiteAlpha.400" />
                <Text fontSize="xs" color="whiteAlpha.700">
                  or
                </Text>
                <Box h="1px" flex="1" bg="whiteAlpha.400" />
              </Flex>
              <Button
                onClick={() => setShowEmail(true)}
                variant="outline"
                borderColor="whiteAlpha.400"
                color="white"
                borderRadius="full"
                w="260px"
                h="40px"
                fontSize="sm"
                fontWeight="600"
                _hover={{ bg: "whiteAlpha.100" }}
              >
                Continue with email
              </Button>
            </Flex>
          )}
        </Box>
      ) : null}

      {error ? (
        <Text mt={3} fontSize="sm" color="red.400" textAlign="center">
          {error}
        </Text>
      ) : null}

      <Text mt={4} fontSize="xs" color="whiteAlpha.600" textAlign="center">
        Signing in uses the same account as the Nexzy app.
      </Text>
    </Box>
  );
}
