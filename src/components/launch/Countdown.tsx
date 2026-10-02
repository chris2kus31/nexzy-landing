"use client";

// Live countdown to the 1.1.10 launch. Renders nothing until mounted (the page
// is statically built, so the server never prints a stale number), then ticks
// once a second. Calls onLive once when it reaches zero.
import { useEffect, useRef, useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { LAUNCH_AT } from "@/lib/launch";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({
  size = "lg",
  onLive,
}: {
  size?: "lg" | "sm";
  onLive?: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now !== null && now >= LAUNCH_AT && !fired.current) {
      fired.current = true;
      onLive?.();
    }
  }, [now, onLive]);

  if (now === null) {
    // Reserve height so the layout doesn't jump on mount.
    return <Box h={size === "lg" ? { base: "76px", md: "92px" } : "22px"} />;
  }

  const t = parts(LAUNCH_AT - now);

  if (size === "sm") {
    return (
      <Text
        as="span"
        fontFamily="title"
        fontWeight="700"
        fontSize="sm"
        color="nexzy.gold"
        letterSpacing="0.04em"
        aria-label={`Launches in ${t.d} days ${t.h} hours ${t.m} minutes`}
      >
        {t.d}d {pad(t.h)}h {pad(t.m)}m {pad(t.s)}s
      </Text>
    );
  }

  const units: [string, string][] = [
    [String(t.d), "days"],
    [pad(t.h), "hrs"],
    [pad(t.m), "min"],
    [pad(t.s), "sec"],
  ];

  return (
    <HStack
      gap={{ base: 2, md: 3 }}
      role="timer"
      aria-label={`Launches in ${t.d} days ${t.h} hours ${t.m} minutes`}
    >
      {units.map(([v, label]) => (
        <Box
          key={label}
          minW={{ base: "64px", md: "78px" }}
          px={{ base: 2, md: 3 }}
          py={{ base: 2, md: 3 }}
          borderRadius="xl"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="nexzy.yellow/25"
          textAlign="center"
          boxShadow="inset 0 1px 0 rgba(255,255,255,0.06)"
        >
          <Text
            fontFamily="title"
            fontWeight="700"
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="1"
            color="white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {v}
          </Text>
          <Text
            fontSize="2xs"
            mt={1.5}
            color="nexzy.gold"
            textTransform="uppercase"
            letterSpacing="0.14em"
            fontWeight="600"
          >
            {label}
          </Text>
        </Box>
      ))}
    </HStack>
  );
}
