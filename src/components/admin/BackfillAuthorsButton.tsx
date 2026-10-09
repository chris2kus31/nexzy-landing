"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  Text,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { backfillAuthors, reprocessPublished } from "@/lib/admin/client";

/**
 * Maintenance actions for the article archive:
 *  - "Assign authors" — stamps a byline (from the Writers tab personas) onto
 *    posts that have none. Existing bylines are kept.
 *  - "Reprocess" — heavy: re-runs the writer over every published news article
 *    to upgrade it to the current voice/structure, then the editor re-checks
 *    it, in the background.
 * Both change live articles, so they need the maintenance password, which the
 * SERVER checks (NEWSROOM_MAINTENANCE_SECRET) on top of owner-only admin auth.
 */

/** Reprocess response — tolerant of the older {published, queued} shape and of
 *  the newer refusal/dedupe counts the API may return. */
interface ReprocessResult {
  published?: number;
  queued?: number;
  refused?: number;
  skipped?: number;
  alreadyRunning?: boolean | number;
  message?: string;
}

export default function BackfillAuthorsButton() {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [pass, setPass] = useState("");
  // Safer default: reprocessed articles go back through review (off the live
  // site until re-approved) instead of being rewritten live.
  const [routeReview, setRouteReview] = useState(true);

  // The password is validated server-side (against NEWSROOM_MAINTENANCE_SECRET);
  // here we only require a non-empty value so changing the server secret never
  // breaks the button. A wrong password returns 403 and shows below.
  const unlocked = pass.trim().length > 0;

  const gate = (): boolean => {
    if (!unlocked) {
      setMsg("Enter the maintenance password to run archive actions.");
      return false;
    }
    return true;
  };

  const assign = async () => {
    if (!gate()) return;
    setBusy("assign");
    setMsg("");
    try {
      const r = await backfillAuthors(pass.trim());
      setMsg(
        r
          ? `Assigned authors to ${r.updated} of ${r.scanned} articles.`
          : "Assign authors started.",
      );
    } catch (e) {
      setMsg((e as Error)?.message || "Assign failed.");
    } finally {
      setBusy("");
    }
  };

  const reprocess = async () => {
    if (!gate()) return;
    const warning = routeReview
      ? "Reprocess ALL published articles into the REVIEW QUEUE? Each is re-written in its author's voice and moved to review — it leaves the live site until you approve it again."
      : "Reprocess ALL published articles LIVE? This re-writes each one in its author's voice and runs in the background. It changes live article text before you see it.";
    if (!window.confirm(warning)) return;
    setBusy("reprocess");
    setMsg("");
    try {
      const r = (await reprocessPublished(
        pass.trim(),
        routeReview,
      )) as ReprocessResult | null;
      setMsg(describeReprocess(r, routeReview));
    } catch (e) {
      setMsg((e as Error)?.message || "Reprocess failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
    >
      <Heading size="md" color="nexzy.white" mb={1}>
        Article archive maintenance
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={3}>
        Assign gives posts without a byline one of your writers (from the
        Writers tab); existing bylines are kept. Reprocess re-writes every
        published news article in its author&apos;s voice + current structure,
        then re-runs the editor (background jobs, after any breaking news in the
        queue). Both change live articles — the maintenance password is checked
        on the server.
      </Text>

      <Input
        type="password"
        placeholder="Maintenance password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        size="sm"
        maxW="260px"
        mb={3}
        bg="whiteAlpha.100"
        borderColor={unlocked ? "nexzy.blue" : "whiteAlpha.300"}
        color="nexzy.white"
        _placeholder={{ color: "nexzy.gray.100" }}
      />

      <HStack gap={2} wrap="wrap">
        <Button
          size="sm"
          variant="outline"
          color="nexzy.white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={assign}
          loading={busy === "assign"}
          loadingText="Assigning…"
          disabled={!unlocked || busy !== ""}
        >
          Assign authors (fast)
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={reprocess}
          loading={busy === "reprocess"}
          loadingText="Queuing…"
          disabled={!unlocked || busy !== ""}
        >
          Reprocess all published
        </Button>
      </HStack>

      {/* Route-through-review: safer reprocess that lands articles in the queue
          for approval instead of updating the live site. */}
      <HStack
        as="label"
        gap={2}
        mt={3}
        cursor={unlocked ? "pointer" : "not-allowed"}
        opacity={unlocked ? 1 : 0.5}
      >
        <input
          type="checkbox"
          checked={routeReview}
          disabled={!unlocked}
          onChange={(e) => setRouteReview(e.target.checked)}
        />
        <Text color="nexzy.gray.100" fontSize="xs">
          Route reprocessed articles through the review queue (recommended: they
          leave the live site until you re-approve). Off = update live in place.
        </Text>
      </HStack>
      {msg && (
        <VStack align="stretch" mt={3}>
          <Text color="nexzy.lightBlue" fontSize="sm">
            {msg}
          </Text>
        </VStack>
      )}
    </Box>
  );
}

/** Human summary of a reprocess response (old + new API shapes). */
function describeReprocess(
  r: ReprocessResult | null,
  routeReview: boolean,
): string {
  if (!r) return "Reprocess request sent.";
  if (r.alreadyRunning) {
    return (
      r.message ||
      "A reprocess run is already in progress — nothing new was queued. Wait for it to finish."
    );
  }
  const queued = r.queued ?? 0;
  const parts = [
    r.published != null
      ? `Queued ${queued} of ${r.published} published articles`
      : `Queued ${queued} articles`,
  ];
  const refused = (r.refused ?? 0) + (r.skipped ?? 0);
  if (refused > 0) {
    parts.push(`${refused} skipped (already queued or not a news article)`);
  }
  const tail = routeReview
    ? "they'll land in the Review queue as jobs run."
    : "they'll update live as jobs run.";
  return `${parts.join(", ")} — ${tail}`;
}
