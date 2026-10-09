"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
} from "@chakra-ui/react";
import {
  createManualLead,
  updateManualLead,
  type ContentSuggestion,
  type ManualLeadInput,
} from "@/lib/admin/client";
import { POST_KINDS, logPost } from "@/lib/admin/client-postlog";

const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  background: "#0f1626",
  color: "#eef2f8",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "8px",
  padding: "7px 12px",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const LANES: [NonNullable<ManualLeadInput["lane"]>, string][] = [
  ["news", "News"],
  ["deal", "Deal"],
  ["guide", "Guide"],
  ["meme", "Fun / meme"],
];

const CONTEXT_MAX = 6000;

/** Basic client-side check — the server fetches this URL, so only https. */
function isHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname;
  } catch {
    return false;
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text color="whiteAlpha.700" fontSize="xs" fontWeight="700" mb={1}>
      {children}
    </Text>
  );
}

/**
 * "+ New suggestion" — create (or edit) an AT-WILL lead from your own topic +
 * context, no article needed. The context is the ONLY thing the writer may say
 * (and what the editor's fact-check reads). On create it lands at the top of
 * Content Studio → Leads with a MANUAL badge; from there Generate / Quick
 * announce work exactly like any other lead.
 */
export default function ManualLeadForm({
  writers,
  existing,
  onSaved,
  onCancel,
}: {
  writers: string[];
  /** Edit mode: the manual lead being edited (its payload.manual pre-fills). */
  existing?: ContentSuggestion;
  onSaved: (card: ContentSuggestion | null) => void | Promise<void>;
  onCancel: () => void;
}) {
  const init = existing?.payload?.manual;
  const editing = !!existing;
  const [title, setTitle] = useState(init?.title ?? existing?.title ?? "");
  const [context, setContext] = useState(init?.context ?? "");
  const [lane, setLane] = useState<NonNullable<ManualLeadInput["lane"]>>(
    init?.lane ?? "news",
  );
  const [writer, setWriter] = useState("");
  const [game, setGame] = useState((init?.games ?? []).join(", "));
  const [angle, setAngle] = useState(init?.angle ?? "");
  const [imageUrl, setImageUrl] = useState(init?.imageUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // "Log it": the thing is ALREADY made/posted — skip the AI entirely and land
  // a card in Suggestions with its labels + Posted box (zero-token).
  const [mode, setMode] = useState<"lead" | "log">("lead");
  const [kind, setKind] = useState(lane === "meme" ? "video_meme" : "");
  const [logged, setLogged] = useState<ContentSuggestion | null>(null);
  const logging = !editing && mode === "log";

  const titleOk = title.trim().length >= 3;
  const contextOk = context.trim().length >= 20;

  const submitLog = async () => {
    if (!titleOk) {
      setErr("Add a title (at least 3 characters).");
      return;
    }
    if (!kind) {
      setErr("Pick what it is (meme, short, ...).");
      return;
    }
    const img = imageUrl.trim();
    if (img && !isHttpsUrl(img)) {
      setErr("Image URL must be a full https:// link (or leave it empty).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const games = game
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 3);
      const res = await logPost({
        title: title.trim(),
        kind,
        lane,
        games,
        ...(context.trim() ? { context: context.trim() } : {}),
        ...(angle.trim() ? { angle: angle.trim() } : {}),
        ...(img ? { imageUrl: img } : {}),
      });
      setLogged(res.card);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't log it.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!titleOk || !contextOk) {
      setErr(
        !titleOk
          ? "Add a topic (at least 3 characters)."
          : "Add some context — at least a sentence or two of facts.",
      );
      return;
    }
    const img = imageUrl.trim();
    if (img && !isHttpsUrl(img)) {
      setErr("Image URL must be a full https:// link (or leave it empty).");
      return;
    }
    setBusy(true);
    setErr(null);
    const games = game
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
      .slice(0, 3);
    const input: ManualLeadInput = {
      title: title.trim(),
      context: context.trim(),
      lane,
      games,
      // On EDIT, send '' explicitly so clearing the box clears the field
      // (the API treats '' as "clear"); on create, omit empty optionals.
      ...(angle.trim() || editing ? { angle: angle.trim() } : {}),
      ...(img || editing ? { imageUrl: img } : {}),
    };
    try {
      const res = editing
        ? await updateManualLead(existing!.id, input)
        : await createManualLead({
            ...input,
            ...(writer ? { writer } : {}),
          });
      if (!res?.ok) {
        setErr("Couldn't save the lead. Try again.");
        return;
      }
      await onSaved(res.card);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the lead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="nexzy.blue"
      borderRadius="xl"
      p={4}
    >
      <Text color="nexzy.white" fontWeight="700" mb={1}>
        {editing ? "Edit context" : "New suggestion (no article)"}
      </Text>
      {!editing && (
        <HStack gap={2} mb={2}>
          {(
            [
              ["lead", "New lead"],
              ["log", "Already made it? Log it"],
            ] as const
          ).map(([m, l]) => (
            <Button
              key={m}
              size="xs"
              variant={mode === m ? "solid" : "outline"}
              bg={mode === m ? "nexzy.blue" : undefined}
              color={mode === m ? "white" : "nexzy.gray.100"}
              borderColor="whiteAlpha.300"
              onClick={() => {
                setMode(m);
                setErr(null);
              }}
            >
              {l}
            </Button>
          ))}
        </HStack>
      )}
      <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
        {editing
          ? "Changes apply the next time you Generate. Nothing runs until you do."
          : logging
            ? "For a meme or short you already made (something seen on social, no lead). No AI runs. It lands in Suggestions with its labels and a Posted box, and Produce adds it to the Video Library."
            : "Lands in Leads like any other lead. One quick analysis runs now; the heavy writing only runs when you hit Generate."}
      </Text>

      {logged && (
        <Box
          mb={3}
          p={3}
          borderRadius="lg"
          bg="green.500/10"
          border="1px solid"
          borderColor="green.400/40"
        >
          <Text color="green.200" fontSize="sm" mb={2}>
            Logged. &ldquo;{logged.title}&rdquo; is in Suggestions: open it,
            fill its labels and paste where it went in Posted &amp; labels.
          </Text>
          <HStack gap={2}>
            <Button
              size="xs"
              bg="nexzy.blue"
              color="white"
              onClick={() => {
                window.location.href =
                  "/admin?tab=content-studio&sub=suggestions";
              }}
            >
              Open Suggestions
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color="nexzy.gray.100"
              onClick={onCancel}
            >
              Done
            </Button>
          </HStack>
        </Box>
      )}

      <Box mb={3}>
        <Label>TOPIC</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ocarina of Time Remake hits Switch 2 on Nov 5"
          maxLength={200}
          size="sm"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.300"
          color="nexzy.white"
        />
      </Box>

      <Box mb={3}>
        <Label>
          {logging
            ? "NOTES (optional) — what it was about"
            : "CONTEXT AND FACTS — the only thing it may say"}
        </Label>
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value.slice(0, CONTEXT_MAX))}
          placeholder={
            "Paste notes, bullets or a source excerpt.\n- Nintendo confirmed Nov 5, 2026, Switch 2 only\n- Reworked visuals, refreshed combat, new areas"
          }
          rows={7}
          size="sm"
          bg="whiteAlpha.100"
          borderColor="whiteAlpha.300"
          color="nexzy.gray.100"
        />
        <Text color="whiteAlpha.500" fontSize="xs" mt={1}>
          {context.length} / {CONTEXT_MAX} · Be specific — names, dates,
          numbers. Anything not here won&apos;t be said.
        </Text>
      </Box>

      <Flex gap={3} wrap="wrap" mb={3}>
        {logging && (
          <Box flex="1 1 160px">
            <Label>WHAT IT IS</Label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              style={SELECT_STYLE}
            >
              <option value="">Pick…</option>
              {POST_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </Box>
        )}
        <Box flex="1 1 160px">
          <Label>LANE</Label>
          <select
            value={lane}
            onChange={(e) =>
              setLane(e.target.value as NonNullable<ManualLeadInput["lane"]>)
            }
            style={SELECT_STYLE}
          >
            {LANES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Box>
        {!editing && !logging && (
          <Box flex="1 1 160px">
            <Label>WRITER</Label>
            <select
              value={writer}
              onChange={(e) => setWriter(e.target.value)}
              style={SELECT_STYLE}
            >
              <option value="">Auto (suggest)</option>
              {(writers.length ? writers : ["Chuy", "Leslie"]).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </Box>
        )}
        <Box flex="1 1 160px">
          <Label>GAME (optional, comma-separated)</Label>
          <Input
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Ocarina of Time"
            size="sm"
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.300"
            color="nexzy.white"
          />
        </Box>
      </Flex>

      <details style={{ marginBottom: 12 }}>
        <summary
          style={{
            cursor: "pointer",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          MORE (optional)
        </summary>
        <Flex gap={3} wrap="wrap" mt={2}>
          <Box flex="1 1 220px">
            <Label>ANGLE</Label>
            <Input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="First full remake since the 3DS"
              maxLength={300}
              size="sm"
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
            />
          </Box>
          <Box flex="1 1 220px">
            <Label>IMAGE URL</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              maxLength={1000}
              size="sm"
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.300"
              color="nexzy.white"
            />
          </Box>
        </Flex>
      </details>

      {err && (
        <Text color="red.300" fontSize="sm" mb={2}>
          {err}
        </Text>
      )}

      <HStack justify="flex-end" gap={2}>
        <Button
          size="sm"
          variant="ghost"
          color="nexzy.gray.100"
          _hover={{ bg: "whiteAlpha.100" }}
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          bg="nexzy.blue"
          color="white"
          _hover={{ opacity: 0.9 }}
          loading={busy}
          disabled={!!logged}
          onClick={() => void (logging ? submitLog() : submit())}
        >
          {editing ? "Save context" : logging ? "Log it" : "Create lead"}
        </Button>
      </HStack>
    </Box>
  );
}
