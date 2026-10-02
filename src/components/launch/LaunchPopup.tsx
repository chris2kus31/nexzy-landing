"use client";

// Launch campaign popup for the public site (Nexzy 1.1.10, "Follow the games
// you love"). Deliberately small and non-blocking so it never counts as an
// intrusive interstitial on mobile (Google search ranking): a corner card on
// desktop, a short bottom sheet on phones, no backdrop, a big close button.
//
// When it appears (pre-launch and live phases are tracked separately):
//   - on the visitor's 2nd page view this session (after 4s), or
//   - after 25s on a page once they've scrolled 35% of it
//   - never on /follow, admin, auth, embeds or legal pages
//   - closed: hidden for 7 days; subscribed: never again pre-launch
// Pre-launch: countdown + "Notify me" email (joins the newsletter list,
// source=launch_popup). From LAUNCH_AT: "It's live" + smart store link.
// Off after CAMPAIGN_END_AT, or set NEXT_PUBLIC_LAUNCH_POPUP=off.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { FaXmark, FaArrowRight } from "react-icons/fa6";
import { BsFillLightningChargeFill } from "react-icons/bs";
import { track } from "@/lib/analytics";
import { CAMPAIGN_END_AT, getAppUrl, isLive } from "@/lib/launch";
import Countdown from "@/components/launch/Countdown";
import EmailCapture from "@/components/landing/EmailCapture";

const EXCLUDED = [
  "/follow",
  "/admin",
  "/auth",
  "/embed",
  "/privacy",
  "/terms",
  "/guidelines",
  "/delete-account",
];
const VIEWS_KEY = "nexzy_launch_views";
const SNOOZE_DAYS = 7;
const DELAY_ON_SECOND_VIEW_MS = 4000;
const DWELL_MS = 25000;
const SCROLL_RATIO = 0.35;

type Phase = "pre" | "live";
type Stored = { closedAt?: number; subscribed?: boolean };

const keyFor = (phase: Phase) => `nexzy_launch_popup_${phase}_v1`;

function read(phase: Phase): Stored {
  try {
    return JSON.parse(localStorage.getItem(keyFor(phase)) || "{}") as Stored;
  } catch {
    return {};
  }
}
function write(phase: Phase, patch: Stored) {
  try {
    localStorage.setItem(
      keyFor(phase),
      JSON.stringify({ ...read(phase), ...patch }),
    );
  } catch {
    // storage blocked: popup simply shows again next visit
  }
}
function eligible(phase: Phase): boolean {
  const s = read(phase);
  if (phase === "pre" && s.subscribed) return false;
  if (s.closedAt && Date.now() - s.closedAt < SNOOZE_DAYS * 86400000) {
    return false;
  }
  return true;
}

export default function LaunchPopup() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("pre");
  const shown = useRef(false);

  const disabled =
    process.env.NEXT_PUBLIC_LAUNCH_POPUP === "off" ||
    EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const show = useCallback((p: Phase) => {
    if (shown.current) return;
    shown.current = true;
    setPhase(p);
    setOpen(true);
    track("launch_popup_view", { phase: p });
  }, []);

  useEffect(() => {
    if (disabled || shown.current) return;
    const now = Date.now();
    if (now >= CAMPAIGN_END_AT) return;
    const p: Phase = isLive(now) ? "live" : "pre";
    if (!eligible(p)) return;

    let views = 1;
    try {
      views = Number(sessionStorage.getItem(VIEWS_KEY) || "0") + 1;
      sessionStorage.setItem(VIEWS_KEY, String(views));
    } catch {
      // ignore
    }

    if (views >= 2) {
      const t = setTimeout(() => show(p), DELAY_ON_SECOND_VIEW_MS);
      return () => clearTimeout(t);
    }

    let dwelled = false;
    let scrolled = false;
    const maybe = () => {
      if (dwelled && scrolled) show(p);
    };
    const onScroll = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      if (window.scrollY / max >= SCROLL_RATIO) {
        scrolled = true;
        maybe();
      }
    };
    const t = setTimeout(() => {
      dwelled = true;
      maybe();
    }, DWELL_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, disabled, show]);

  const close = () => {
    setOpen(false);
    write(phase, { closedAt: Date.now() });
    track("launch_popup_dismiss", { phase });
  };

  if (!open || disabled) return null;

  return (
    <Box
      className="nexzy-popup-in"
      role="dialog"
      aria-label="The new Nexzy"
      position="fixed"
      zIndex={1400}
      bottom={{ base: 0, md: 6 }}
      right={{ base: 0, md: 6 }}
      left={{ base: 0, md: "auto" }}
      w={{ base: "full", md: "380px" }}
      maxH={{ base: "60vh", md: "none" }}
      overflowY="auto"
      bg="#1A1F3A"
      border="1px solid"
      borderColor="nexzy.yellow/30"
      borderRadius={{ base: "20px 20px 0 0", md: "2xl" }}
      boxShadow="0 24px 70px rgba(0,0,0,0.6)"
      p={{ base: 5, md: 6 }}
      pb={{ base: "calc(20px + env(safe-area-inset-bottom))", md: 6 }}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        borderTopRadius="inherit"
        bg="linear-gradient(90deg, #4DA3FF, #FFC400)"
        aria-hidden
      />
      <Flex justify="space-between" align="center" mb={3}>
        <HStack gap={2} color="nexzy.gold">
          <BsFillLightningChargeFill />
          <Text
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.14em"
          >
            {phase === "live" ? "Out now" : "The new Nexzy"}
          </Text>
        </HStack>
        <Button
          aria-label="Close"
          onClick={close}
          variant="ghost"
          minW="44px"
          h="44px"
          mr={-2}
          mt={-2}
          borderRadius="full"
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100", color: "white" }}
        >
          <FaXmark />
        </Button>
      </Flex>

      <Stack gap={3}>
        <Text
          fontFamily="title"
          fontWeight="700"
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.15"
          color="white"
        >
          {phase === "live" ? (
            "The new Nexzy is live."
          ) : (
            <>
              Follow the games you love.{" "}
              <Box
                as="span"
                style={{
                  background: "linear-gradient(90deg, #4DA3FF, #FFC400)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                And the gamers who get them.
              </Box>
            </>
          )}
        </Text>
        <Text fontSize="sm" color="#c9d1e6">
          One feed for every game you follow: news, trailers, updates, and the
          players who love them too.
        </Text>

        {phase === "live" ? (
          <Button
            asChild
            size="lg"
            bg="nexzy.gold"
            color="nexzy.navy"
            fontWeight="700"
            borderRadius="full"
            _hover={{ bg: "nexzy.yellow" }}
            boxShadow="0 8px 22px rgba(255,201,71,0.28)"
          >
            <a
              href={getAppUrl("web_popup")}
              onClick={() => {
                track("launch_popup_click", { phase, target: "get_app" });
                write(phase, { closedAt: Date.now() });
              }}
            >
              Get the app <FaArrowRight />
            </a>
          </Button>
        ) : (
          <>
            <HStack gap={2}>
              <Text
                fontSize="xs"
                color="#8892A6"
                textTransform="uppercase"
                letterSpacing="0.12em"
                fontWeight="600"
              >
                Drops Oct 21 in
              </Text>
              <Countdown size="sm" onLive={() => setPhase("live")} />
            </HStack>
            <EmailCapture
              variant="hero"
              source="launch_popup"
              title=""
              buttonLabel="Notify me"
              successMessage="You're on the list. We'll ping you on Oct 21."
              footnote="Plus our weekly gaming news. Unsubscribe anytime."
              stacked
              showPreferredSource={false}
              onSuccess={() => write("pre", { subscribed: true })}
            />
            <Button
              asChild
              variant="ghost"
              size="sm"
              color="nexzy.gold"
              alignSelf="start"
              px={0}
              _hover={{ bg: "transparent", textDecoration: "underline" }}
            >
              <NextLink
                href="/follow"
                onClick={() =>
                  track("launch_popup_click", { phase, target: "follow" })
                }
              >
                See what&apos;s coming <FaArrowRight />
              </NextLink>
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
