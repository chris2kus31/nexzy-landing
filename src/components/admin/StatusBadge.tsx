"use client";

import { Badge } from "@chakra-ui/react";

const PALETTE: Record<string, string> = {
  drafted: "gray",
  edited: "blue",
  illustrated: "purple",
  ready_for_review: "yellow",
  published: "green",
  rejected: "red",
  sent_back: "orange",
  needs_attention: "orange",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge colorPalette={PALETTE[status] || "gray"} variant="solid" size="sm">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
