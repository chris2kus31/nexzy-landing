"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Stack,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
} from "@chakra-ui/react";
import {
  commissionStory,
  commissionReview,
  getWriterNames,
} from "@/lib/admin/client";
import { BEATS } from "@/lib/blog/beats";
import { verdictTierFor } from "@/lib/blog/verdict";

/**
 * "Commission" desk. Two roads:
 *  - News: hand the AI staff an angle + optional source; they research → write.
 *  - Review: YOU supply the substance — persona, your rating, and the real
 *    points to cover — and the writer turns it into their review voice with
 *    your verdict locked in (no AI research, no invented scenes).
 * It lands in the review queue and is never auto-rejected.
 */
export default function CommissionPanel({ onRan }: { onRan?: () => void }) {
  const [mode, setMode] = useState<"news" | "review">("news");
  const [beat, setBeat] = useState(BEATS[0].key);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [angle, setAngle] = useState("");
  // In review mode this textarea holds the points to cover; in news mode it
  // holds the editor's own first-party NOTES (sent as `notes`).
  const [instructions, setInstructions] = useState("");
  const [structure, setStructure] = useState("");
  const [directives, setDirectives] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rating, setRating] = useState(7);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [author, setAuthor] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  // AI hero image is OPT-IN (default off) — checking it spends image tokens.
  const [genImage, setGenImage] = useState(false);

  useEffect(() => {
    getWriterNames()
      .then(setAuthors)
      .catch(() => {});
  }, []);

  const isReview = mode === "review";
  const clampR = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  const tier = verdictTierFor(author || "Chuy", rating);
  // News needs at least one real input: an angle, some notes, or an inspiration
  // link. Everything else (structure, directives, title) is optional.
  const newsHasSubstance =
    angle.trim().length >= 6 ||
    instructions.trim().length >= 6 ||
    sourceUrl.trim().length > 0;
  const canSend = isReview
    ? title.trim().length >= 2 && instructions.trim().length >= 10 && !sending
    : newsHasSubstance && !sending;

  const submit = async () => {
    setSending(true);
    setMsg(null);
    try {
      if (isReview) {
        await commissionReview({
          title: title.trim(),
          author: author || undefined,
          rating,
          notes: instructions.trim(),
          generateImage: genImage,
        });
        setMsg({
          ok: true,
          text: "Review commissioned. Your writer is drafting it in their voice with your rating locked in — it'll land in the review queue below in a few minutes. Hit Refresh.",
        });
      } else {
        await commissionStory({
          beat,
          angle: angle.trim() || undefined,
          notes: instructions.trim() || undefined,
          structure: structure.trim() || undefined,
          directives: directives.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          workingTitle: title.trim() || undefined,
          author: author || undefined,
          generateImage: genImage,
        });
        setMsg({
          ok: true,
          text: "Commissioned. The newsroom is reading your inspiration, researching real facts, and writing it now — it'll appear in the review queue below in a few minutes. Hit Refresh to check.",
        });
      }
      setTitle("");
      setSourceUrl("");
      setAngle("");
      setInstructions("");
      setStructure("");
      setDirectives("");
      setGenImage(false);
      onRan?.();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error)?.message || "Could not commission.",
      });
    } finally {
      setSending(false);
    }
  };

  const modeBtn = (m: "news" | "review", label: string, palette: string) => {
    const active = mode === m;
    return (
      <Button
        size="sm"
        onClick={() => setMode(m)}
        bg={
          active
            ? palette === "purple"
              ? "purple.500"
              : "nexzy.blue"
            : "transparent"
        }
        color={active ? "white" : "nexzy.gray.100"}
        borderWidth="1px"
        borderColor={
          active
            ? palette === "purple"
              ? "purple.500"
              : "nexzy.blue"
            : "whiteAlpha.300"
        }
        _hover={{ bg: active ? undefined : "whiteAlpha.100" }}
      >
        {label}
      </Button>
    );
  };

  const writerPicker = (
    <Box>
      <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
        {isReview
          ? "Reviewer / persona (their voice + verdict wording)"
          : "Writer (optional — the desk picks by default)"}
      </Text>
      <HStack gap={2} wrap="wrap">
        <Button
          size="sm"
          onClick={() => setAuthor("")}
          bg={author === "" ? "nexzy.blue" : "transparent"}
          color={author === "" ? "white" : "nexzy.gray.100"}
          borderWidth="1px"
          borderColor={author === "" ? "nexzy.blue" : "whiteAlpha.300"}
          _hover={{ bg: author === "" ? "nexzy.blue" : "whiteAlpha.100" }}
        >
          Auto
        </Button>
        {authors.map((a) => {
          const active = author === a;
          return (
            <Button
              key={a}
              size="sm"
              onClick={() => setAuthor(a)}
              bg={active ? "nexzy.blue" : "transparent"}
              color={active ? "white" : "nexzy.gray.100"}
              borderWidth="1px"
              borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
              _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            >
              {a}
            </Button>
          );
        })}
      </HStack>
    </Box>
  );

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={5}
      mb={8}
    >
      <HStack gap={2} mb={4}>
        {modeBtn("news", "News story", "blue")}
        {modeBtn("review", "Review", "purple")}
      </HStack>

      <Heading size="md" color="nexzy.white" mb={1}>
        {isReview ? "Commission a review" : "Commission a story"}
      </Heading>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        {isReview
          ? "Reviewing something yourself? Pick the persona, set your rating, and give them the real points to hit — what works, where it stumbles, the standout moments. They write it up in their voice with your verdict locked in. No AI research, no invented scenes."
          : "Found a story you want covered? Drop an inspiration link (we take the idea + what it covers, never its words), set your angle, and add any of your own facts. The staff searches real current facts, writes it in the chosen voice, edits, and illustrates it — then it lands in your review queue."}
      </Text>

      <Stack gap={4}>
        {!isReview && (
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
              Beat
            </Text>
            <HStack gap={2} wrap="wrap">
              {BEATS.map((b) => {
                const active = beat === b.key;
                return (
                  <Button
                    key={b.key}
                    size="sm"
                    onClick={() => setBeat(b.key)}
                    bg={active ? "nexzy.blue" : "transparent"}
                    color={active ? "white" : "nexzy.gray.100"}
                    borderWidth="1px"
                    borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                    _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                  >
                    {b.label}
                  </Button>
                );
              })}
            </HStack>
          </Box>
        )}

        {writerPicker}

        {!isReview && (
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
              Angle
            </Text>
            <Input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="Where you're taking it — e.g. 2026 releases as a fast 60–90-sec read"
              color="nexzy.white"
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              _placeholder={{ color: "nexzy.gray.100" }}
            />
          </Box>
        )}

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            {isReview
              ? "What you're reviewing (movie or show)"
              : "Working title (optional)"}
          </Text>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isReview
                ? "e.g. Spider-Man: Brand New Day"
                : "e.g. GTA 6 delayed again"
            }
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        {!isReview && (
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
              Inspiration link (optional)
            </Text>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://… — the story that sparked the idea"
              color="nexzy.white"
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.300"
              _placeholder={{ color: "nexzy.gray.100" }}
            />
            <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
              We read it for the idea + what it covers — never copied. Real
              facts come from our own search.
            </Text>
          </Box>
        )}

        {isReview && (
          <Box>
            <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
              Your rating
            </Text>
            <HStack gap={2}>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => setRating((r) => clampR(r - 1))}
                disabled={rating <= 1}
              >
                −
              </Button>
              <Input
                w="64px"
                textAlign="center"
                type="number"
                value={rating}
                onChange={(e) => setRating(clampR(Number(e.target.value) || 1))}
                color="nexzy.white"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.300"
              />
              <Text color="nexzy.gray.100" fontSize="sm">
                / 10
              </Text>
              <Button
                size="sm"
                variant="outline"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => setRating((r) => clampR(r + 1))}
                disabled={rating >= 10}
              >
                +
              </Button>
              <Text color="teal.300" fontWeight="700" fontSize="sm" ml={2}>
                {tier}
              </Text>
            </HStack>
            <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
              The tier is {author || "the assigned writer"}&apos;s wording for
              this score; the number stays for the star rating.
            </Text>
          </Box>
        )}

        <Box>
          <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
            {isReview
              ? "The real points to cover (your grounding — the writer works only from these)"
              : "Notes — your own facts to include (optional, one per line)"}
          </Text>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={
              isReview
                ? "One point per line — what works, where it stumbles, standout moments, who it's for. e.g.\n- Combat is lifted straight from the Insomniac games; feels incredible\n- Plot is thin and predictable through the middle\n- Best for franchise fans; newcomers will shrug"
                : "Things you know that should be baked in as fact (woven in, never labeled). One per line. e.g.\n- Confirmed: the collector's edition ships in March\n- Our readers care most about the Switch 2 launch titles"
            }
            rows={isReview ? 6 : 4}
            color="nexzy.white"
            bg="whiteAlpha.50"
            borderColor="whiteAlpha.300"
            _placeholder={{ color: "nexzy.gray.100" }}
          />
        </Box>

        {!isReview && (
          <Box>
            <Button
              size="sm"
              variant="ghost"
              alignSelf="flex-start"
              color="nexzy.gray.100"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => setShowAdvanced((v) => !v)}
              mb={showAdvanced ? 3 : 0}
            >
              {showAdvanced ? "− Hide" : "+ Add"} structure &amp; directives
            </Button>
            {showAdvanced && (
              <Stack gap={4}>
                <Box>
                  <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                    Structure (optional — how to order/shape it)
                  </Text>
                  <Textarea
                    value={structure}
                    onChange={(e) => setStructure(e.target.value)}
                    placeholder="e.g. Open with the release window, then one line per game in date order, close with the one to watch."
                    rows={3}
                    color="nexzy.white"
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.300"
                    _placeholder={{ color: "nexzy.gray.100" }}
                  />
                </Box>
                <Box>
                  <Text color="nexzy.gray.100" fontSize="xs" mb={2}>
                    Extra directives (optional — work for the staff to carry
                    out)
                  </Text>
                  <Textarea
                    value={directives}
                    onChange={(e) => setDirectives(e.target.value)}
                    placeholder="e.g. Research each game in the source for its current release date, platforms, and a one-line description."
                    rows={3}
                    color="nexzy.white"
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.300"
                    _placeholder={{ color: "nexzy.gray.100" }}
                  />
                </Box>
              </Stack>
            )}
          </Box>
        )}

        <Button
          size="sm"
          alignSelf="flex-start"
          onClick={() => setGenImage((v) => !v)}
          bg={genImage ? "nexzy.blue" : "transparent"}
          color={genImage ? "white" : "nexzy.gray.100"}
          borderWidth="1px"
          borderColor={genImage ? "nexzy.blue" : "whiteAlpha.300"}
          _hover={{ bg: genImage ? "nexzy.blue" : "whiteAlpha.100" }}
        >
          {genImage ? "✓ Generate AI image" : "Generate AI image"}
        </Button>
        <Text color="nexzy.gray.100" fontSize="xs" mt={-2}>
          Off by default — the post lands with no AI hero so you can drop your
          own. Check it to have the art director generate one (spends image
          tokens).
        </Text>

        <Flex justify="flex-end">
          <Button
            size="sm"
            colorPalette={isReview ? "purple" : "blue"}
            onClick={submit}
            disabled={!canSend}
            loading={sending}
            loadingText="Commissioning…"
          >
            {isReview ? "Commission review" : "Commission story"}
          </Button>
        </Flex>
      </Stack>

      {msg && (
        <Text mt={4} fontSize="sm" color={msg.ok ? "green.300" : "red.300"}>
          {msg.text}
        </Text>
      )}
    </Box>
  );
}
