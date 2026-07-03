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

/** Maintenance passphrase — required before either destructive action runs. */
const MAINTENANCE_PASSWORD = "abracadabra";

/**
 * Maintenance actions for the article archive:
 *  - "Assign authors" — fast: just stamps Chuy/Eli bylines onto legacy posts.
 *  - "Reprocess" — heavy: re-runs the writer over every published article to
 *    upgrade it to the current voice/structure + author, in the background.
 * Both change live articles, so they're gated behind a maintenance passphrase
 * (typed into the field below) as a deliberate speed-bump. This is a
 * client-side confirmation on top of admin auth, not a server secret.
 */
export default function BackfillAuthorsButton() {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [pass, setPass] = useState("");
  const [routeReview, setRouteReview] = useState(false);

  const unlocked = pass.trim() === MAINTENANCE_PASSWORD;

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
        `Assigned authors to ${r.updated} of ${r.scanned} articles (instant).`,
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
      : "Reprocess ALL published articles? This re-writes each one in its author's voice (Chuy/Eli) and runs in the background. It changes live article text.";
    if (!window.confirm(warning)) return;
    setBusy("reprocess");
    setMsg("");
    try {
      const r = await reprocessPublished(pass.trim(), routeReview);
      setMsg(
        routeReview
          ? `Queued ${r.queued} of ${r.published} articles — they'll land in the Review queue as jobs run.`
          : `Queued ${r.queued} of ${r.published} published articles for reprocessing — they'll update over the next few minutes as jobs run.`,
      );
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
        Assign gives old posts a Chuy/Eli byline instantly. Reprocess re-writes
        every published article in that author's voice + current structure (runs
        in the background; changes live text). Both change live articles —
        confirm with the maintenance password to unlock.
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
        borderColor={unlocked ? "green.400" : "whiteAlpha.300"}
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
          Route reprocessed articles through the review queue (they leave the
          live site until you re-approve). Off = update live in place.
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
