"use client";

import { useState } from "react";
import { Box, HStack, Button } from "@chakra-ui/react";
import NotifyLeadsPanel from "./NotifyLeadsPanel";
import BroadcastPanel from "./BroadcastPanel";

type Sub = "leads" | "compose";

/**
 * Notify tab shell — mirrors the Newsroom / Content Studio layout.
 * Sub-tabs: Leads (candidate pushes from published articles) and Notify at will
 * (the manual composer + weekly cap). Generate → Suggestions lands in a later
 * phase.
 */
export default function NotifyPanel() {
  const [sub, setSub] = useState<Sub>("leads");

  const tabBtn = (active: boolean) => ({
    size: "sm" as const,
    variant: (active ? "solid" : "outline") as "solid" | "outline",
    bg: active ? "nexzy.blue" : "transparent",
    color: active ? "white" : "nexzy.gray.100",
    borderColor: "whiteAlpha.300",
    _hover: { bg: active ? "nexzy.blue" : "whiteAlpha.100" },
  });

  return (
    <Box>
      <HStack gap={2} mb={4}>
        <Button {...tabBtn(sub === "leads")} onClick={() => setSub("leads")}>
          Leads
        </Button>
        <Button
          {...tabBtn(sub === "compose")}
          onClick={() => setSub("compose")}
        >
          Notify at will
        </Button>
      </HStack>
      {sub === "leads" ? <NotifyLeadsPanel /> : <BroadcastPanel />}
    </Box>
  );
}
