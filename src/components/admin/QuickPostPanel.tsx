"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Textarea,
} from "@chakra-ui/react";
import {
  getWriterNames,
  quickSocial,
  type QuickSocialResult,
} from "@/lib/admin/client";

const X_FORMATS = [
  { key: "hot_take", label: "Hot take" },
  { key: "thread", label: "Thread" },
  { key: "poll", label: "Poll" },
] as const;

type XFmt = (typeof X_FORMATS)[number]["key"];

const X_FMT_HINT: Record<XFmt, string> = {
  hot_take:
    "One punchy opinion — the default. Best for reacting to news; ends with a reply-bait angle.",
  thread:
    "A standalone hook tweet + 2–5 follow-up tweets, one point each. Best for roundups / breakdowns / tier lists.",
  poll: "A question + 2–4 options — the poll itself is the engagement. Best for a genuine debate.",
};
type Plat = "x" | "threads";

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="xs"
      variant="outline"
      borderColor="whiteAlpha.300"
      color="nexzy.gray.100"
      _hover={{ bg: "whiteAlpha.100" }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? "Copied ✓" : "Copy"}
    </Button>
  );
}

/** Quick Post — paste something trending, get a growth-rule post in a writer's voice. */
export default function QuickPostPanel() {
  const [writers, setWriters] = useState<string[]>([]);
  const [writer, setWriter] = useState("Chuy");
  const [text, setText] = useState("");
  const [platforms, setPlatforms] = useState<Plat[]>(["x", "threads"]);
  const [xFormat, setXFormat] = useState<XFmt>("hot_take");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<QuickSocialResult | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getWriterNames()
      .then((w) => {
        setWriters(w);
        if (w.length && !w.includes("Chuy")) setWriter(w[0]);
      })
      .catch(() => {});
  }, []);

  const toggle = (p: Plat) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const generate = async () => {
    if (!text.trim() || platforms.length === 0) {
      setErr("Paste something and pick at least one platform.");
      return;
    }
    setErr("");
    setBusy(true);
    setOut(null);
    try {
      const r = await quickSocial({ text: text.trim(), writer, platforms, xFormat });
      setOut(r.data);
    } catch (e) {
      setErr((e as Error)?.message || "Generate failed.");
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) => ({
    size: "xs" as const,
    variant: (active ? "solid" : "outline") as "solid" | "outline",
    bg: active ? "nexzy.blue" : "transparent",
    color: active ? "white" : "nexzy.gray.100",
    borderColor: "whiteAlpha.300",
    _hover: { bg: active ? "nexzy.blue" : "whiteAlpha.100" },
  });

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
      mb={2}
    >
      <Heading size="sm" color="nexzy.white" mb={1}>
        ⚡ Quick Post — X &amp; Threads
      </Heading>
      <Text color="nexzy.gray.100" fontSize="xs" mb={3}>
        Paste something trending (a tweet, a topic, a thought) → get it back as an
        original post that follows the growth rules, in the writer&apos;s tone.
        Copy it out and post manually.
      </Text>

      <Text color="whiteAlpha.600" fontSize="10px" fontWeight="700" mb={1}>
        WRITER
      </Text>
      <HStack gap={2} wrap="wrap" mb={3}>
        {(writers.length ? writers : ["Chuy"]).map((w) => (
          <Button key={w} {...chip(writer === w)} onClick={() => setWriter(w)}>
            {w}
          </Button>
        ))}
      </HStack>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the trending tweet / topic / your thought…"
        bg="whiteAlpha.50"
        color="nexzy.white"
        borderColor="whiteAlpha.300"
        fontSize="sm"
        rows={3}
        mb={3}
      />

      <Flex gap={4} wrap="wrap" mb={3} align="center">
        <HStack gap={2}>
          {(["x", "threads"] as Plat[]).map((p) => (
            <Button
              key={p}
              {...chip(platforms.includes(p))}
              onClick={() => toggle(p)}
            >
              {p === "x" ? "X" : "Threads"}
            </Button>
          ))}
        </HStack>
        {platforms.includes("x") && (
          <HStack gap={2}>
            <Text color="whiteAlpha.500" fontSize="10px">
              X:
            </Text>
            {X_FORMATS.map((f) => (
              <Button
                key={f.key}
                {...chip(xFormat === f.key)}
                onClick={() => setXFormat(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </HStack>
        )}
        <Button
          size="sm"
          colorPalette="green"
          onClick={generate}
          loading={busy}
          loadingText="Writing…"
          ml="auto"
        >
          Generate
        </Button>
      </Flex>

      {platforms.includes("x") && (
        <Text color="whiteAlpha.500" fontSize="11px" mb={3}>
          <Text as="span" color="whiteAlpha.700" fontWeight="700">
            {X_FORMATS.find((f) => f.key === xFormat)?.label}:
          </Text>{" "}
          {X_FMT_HINT[xFormat]}
        </Text>
      )}

      {err && (
        <Text color="red.300" fontSize="xs" mb={2}>
          {err}
        </Text>
      )}

      {out && (
        <VStack align="stretch" gap={3} mt={1}>
          {out.x && (
            <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={3}>
              <Flex justify="space-between" align="center" mb={1}>
                <Text color="nexzy.white" fontSize="xs" fontWeight="700">
                  X
                </Text>
                <Text
                  fontSize="10px"
                  color={
                    (out.x.post?.length ?? 0) > 280
                      ? "red.300"
                      : "whiteAlpha.500"
                  }
                >
                  {out.x.post?.length ?? 0}/280
                </Text>
              </Flex>
              <Textarea
                value={out.x.post}
                onChange={(e) =>
                  setOut({ ...out, x: { ...out.x!, post: e.target.value } })
                }
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                fontSize="sm"
                rows={3}
                mb={2}
              />
              {out.x.thread && out.x.thread.length > 0 && (
                <Box mb={2}>
                  <Text
                    color="whiteAlpha.600"
                    fontSize="10px"
                    fontWeight="700"
                    mb={1}
                  >
                    THREAD
                  </Text>
                  <VStack align="stretch" gap={1}>
                    {out.x.thread.map((t, i) => (
                      <Text key={i} color="nexzy.gray.100" fontSize="xs">
                        {i + 1}. {t}
                      </Text>
                    ))}
                  </VStack>
                </Box>
              )}
              {out.x.poll && out.x.poll.question && (
                <Box mb={2}>
                  <Text
                    color="whiteAlpha.600"
                    fontSize="10px"
                    fontWeight="700"
                    mb={1}
                  >
                    POLL
                  </Text>
                  <Text color="nexzy.gray.100" fontSize="xs">
                    {out.x.poll.question}
                  </Text>
                  <Text color="nexzy.gray.100" fontSize="xs">
                    {(out.x.poll.options || []).join("  ·  ")}
                  </Text>
                </Box>
              )}
              <CopyBtn
                text={
                  out.x.post +
                  (out.x.thread?.length
                    ? "\n\n" + out.x.thread.join("\n\n")
                    : "")
                }
              />
            </Box>
          )}

          {out.threads && (
            <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={3}>
              <Flex justify="space-between" align="center" mb={1}>
                <Text color="nexzy.white" fontSize="xs" fontWeight="700">
                  Threads
                </Text>
                <Text
                  fontSize="10px"
                  color={
                    (out.threads.caption?.length ?? 0) > 500
                      ? "red.300"
                      : "whiteAlpha.500"
                  }
                >
                  {out.threads.caption?.length ?? 0}/500
                </Text>
              </Flex>
              <Textarea
                value={out.threads.caption}
                onChange={(e) =>
                  setOut({
                    ...out,
                    threads: { ...out.threads!, caption: e.target.value },
                  })
                }
                bg="whiteAlpha.50"
                color="nexzy.white"
                borderColor="whiteAlpha.300"
                fontSize="sm"
                rows={3}
                mb={1}
              />
              {out.threads.topicTag && (
                <Text color="whiteAlpha.500" fontSize="10px" mb={2}>
                  topic: {out.threads.topicTag}
                </Text>
              )}
              <CopyBtn text={out.threads.caption} />
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}
