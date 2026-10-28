"use client";

// Countdown to a game's launch. The server prints the launch date (crawlable,
// never a stale number); the ticking blocks appear after mount. A local timer
// only, no network.
import { useEffect, useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}

function Block({ value, label }: { value: number | string; label: string }) {
  return (
    <Box
      bg="#11152b"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="14px"
      px={{ base: 3, md: 4 }}
      py={3}
      minW={{ base: "64px", md: "84px" }}
      textAlign="center"
    >
      <Text
        fontFamily="title"
        fontSize={{ base: "2xl", md: "4xl" }}
        lineHeight="1"
        color="white"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Text>
      <Text fontSize="xs" color="#9aa3bf" mt={1}>
        {label}
      </Text>
    </Box>
  );
}

export default function LaunchCountdown({
  launchAt,
  launchLabel,
}: {
  launchAt: string;
  /** Pre-formatted date string from the server (stable across zones). */
  launchLabel: string;
}) {
  const target = new Date(launchAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const out = now !== null && now >= target;
  const t = parts(now === null ? 0 : target - now);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <HStack gap={{ base: 2, md: 3 }} flexWrap="wrap" align="stretch">
      {now !== null && !out && (
        <>
          <Block value={t.days} label={t.days === 1 ? "day" : "days"} />
          <Block value={pad(t.hours)} label="hours" />
          <Block value={pad(t.min)} label="min" />
          <Box display={{ base: "none", sm: "block" }}>
            <Block value={pad(t.sec)} label="sec" />
          </Box>
        </>
      )}
      <Box display="flex" flexDirection="column" justifyContent="center" pl={1}>
        <Text fontSize="sm" color="#9aa3bf">
          {out ? "Out now" : "Launches"}
        </Text>
        <Text fontSize="md" fontWeight="600" color="white">
          <time dateTime={launchAt}>{launchLabel}</time>
        </Text>
      </Box>
    </HStack>
  );
}
