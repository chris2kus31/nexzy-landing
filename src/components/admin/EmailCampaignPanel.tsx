"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import {
  getEmailAudience,
  previewEmail,
  sendTestEmail,
  sendEmailCampaign,
  getEmailStatus,
  type EmailAudience,
  type EmailAudienceSummary,
  type EmailDraft,
  type EmailJob,
} from "@/lib/admin/client";

/**
 * Marketing > Email: owner-only announcement emails (launch teaser, launch
 * day). Each person gets their own copy - nobody sees anyone else's address -
 * with a personal unsubscribe link. Sent through the API's existing SendGrid
 * SMTP setup. Unsubscribed people are skipped automatically.
 */

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
};

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
  minWidth: "240px",
};

const AUDIENCE_LABEL: Record<EmailAudience, string> = {
  both: "Everyone (app users + subscribers)",
  users: "App users only",
  subscribers: "Newsletter subscribers only",
};

const TEMPLATES: { key: string; label: string; draft: EmailDraft }[] = [
  {
    key: "teaser",
    label: "Email 1 - teaser (Oct 13)",
    draft: {
      subject: "The new Nexzy arrives Oct 21",
      preheader: "Follow the games you love. And the gamers who get them.",
      body: `Hey,

It's Chris, the guy building Nexzy.

The new Nexzy lands Wednesday, October 21. I rebuilt it around one idea: follow the games you love, and their news, trailers and updates come to you in one feed.

You can also keep your library and wishlist in one place, get a price alert when a wishlisted game goes on sale, and meet gamers who play what you play.

On iPhone? Tap below and hit "Notify me" to get pinged the moment it's live.

[Get notified on the App Store](https://apps.apple.com/us/app/id6744055635?eventid=6817727328)

Want a sneak peek first? [See what's coming](https://www.nexzyapp.com/follow).

Already have Nexzy? The update arrives automatically on iPhone and Android.

Hit reply and tell me which game you'll follow first. I read every one.

Chris`,
    },
  },
  {
    key: "launch",
    label: "Email 2 - launch day (Oct 21)",
    draft: {
      subject: "Your gaming feed is live",
      preheader: "Follow a game and watch your feed fill up.",
      body: `Hey,

The new Nexzy is live on iPhone and Android.

Follow a few games and your feed fills up with their news, trailers and updates. Your library and wishlist live in the same place, and you'll get a price alert when a wishlisted game drops.

[Get it on the App Store](https://apps.apple.com/us/app/id6744055635)

[Get it on Google Play](https://play.google.com/store/apps/details?id=com.nexzy.app)

Follow three games, then hit reply and tell me what your feed got right and what it got wrong. I'm fixing things fast this week.

Chris`,
    },
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600" mb={1}>
      {children}
    </Text>
  );
}

export default function EmailCampaignPanel() {
  const [summary, setSummary] = useState<EmailAudienceSummary | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [audience, setAudience] = useState<EmailAudience>("both");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "test" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<EmailJob | null>(null);
  const [running, setRunning] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await getEmailAudience();
      setSummary(s);
      setJob(s.job);
      setLoadErr("");
      setFromName((v) => v || s.defaults.fromName);
      setReplyTo((v) => v || s.defaults.replyTo);
    } catch (e) {
      setLoadErr((e as Error)?.message || "Could not load the audience.");
    }
  }, []);

  useEffect(() => {
    load();
    getEmailStatus()
      .then((st) => {
        setRunning(st.running);
        setJob(st.job);
      })
      .catch(() => {});
  }, [load]);

  // Poll progress while a send is running.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      try {
        const st = await getEmailStatus();
        setJob(st.job);
        if (!st.running) {
          setRunning(false);
          load();
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [running, load]);

  const draft = (): EmailDraft => ({
    subject,
    body,
    preheader,
    fromName,
    replyTo,
  });
  const count = summary?.audiences[audience]?.count ?? 0;
  const info = summary?.audiences[audience];
  const ready =
    !!summary?.defaults.postalAddressSet &&
    !!summary?.defaults.unsubscribeReady;
  const filled = subject.trim().length > 0 && body.trim().length > 0;
  const asksForReply = /reply/i.test(body);

  const applyTemplate = (d: EmailDraft) => {
    setSubject(d.subject);
    setPreheader(d.preheader || "");
    setBody(d.body);
    setPreviewHtml(null);
    setMsg(null);
  };

  const doPreview = async () => {
    setBusy("preview");
    setMsg(null);
    try {
      const r = await previewEmail(draft());
      setPreviewHtml(r.html);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Preview failed." });
    } finally {
      setBusy("");
    }
  };

  const doTest = async () => {
    setBusy("test");
    setMsg(null);
    try {
      const r = await sendTestEmail(draft());
      setMsg({ ok: true, text: `Test sent to ${r.to}. Check your inbox.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Test failed." });
    } finally {
      setBusy("");
    }
  };

  const doSend = async () => {
    if (!confirming) {
      setConfirming(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 6000);
      return;
    }
    setConfirming(false);
    setBusy("send");
    setMsg(null);
    try {
      const r = await sendEmailCampaign({
        ...draft(),
        audience,
        expectedCount: count,
      });
      setJob(r.job);
      setRunning(r.running);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error)?.message || "Send failed." });
      load();
    } finally {
      setBusy("");
    }
  };

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="sm" color="nexzy.white" mb={1}>
          Email your users
        </Heading>
        <Text color="nexzy.gray.100" fontSize="sm">
          Everyone gets their own copy: they see your name as the sender and
          only their own address. Each email has a personal unsubscribe link,
          and anyone who unsubscribed is skipped.
        </Text>
      </Box>

      {loadErr && (
        <Text color="red.300" fontSize="sm">
          {loadErr}
        </Text>
      )}
      {!summary && !loadErr && <Spinner color="nexzy.blue" />}

      {summary && !ready && (
        <Box
          borderWidth="1px"
          borderColor="red.400"
          borderRadius="md"
          p={3}
          bg="whiteAlpha.50"
        >
          {!summary.defaults.postalAddressSet && (
            <Text color="red.300" fontSize="sm">
              Set ANNOUNCE_POSTAL_ADDRESS on the API before sending. US law
              (CAN-SPAM) requires a mailing address in marketing emails.
            </Text>
          )}
          {!summary.defaults.unsubscribeReady && (
            <Text color="red.300" fontSize="sm">
              Set EMAIL_UNSUB_SECRET on the API (unsubscribe links need it).
            </Text>
          )}
        </Box>
      )}

      {summary && (
        <>
          <Flex gap={4} wrap="wrap" align="flex-end">
            <Box>
              <Label>Send to</Label>
              <select
                style={SELECT_STYLE}
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as EmailAudience);
                  setConfirming(false);
                }}
              >
                {(["both", "users", "subscribers"] as EmailAudience[]).map(
                  (a) => (
                    <option key={a} value={a}>
                      {AUDIENCE_LABEL[a]} - {summary.audiences[a].count}
                    </option>
                  ),
                )}
              </select>
            </Box>
            <Text color="nexzy.gray.100" fontSize="xs" pb={2}>
              {count} people
              {info && info.suppressed > 0
                ? ` - ${info.suppressed} skipped (unsubscribed)`
                : ""}
              {info && info.appleRelay > 0
                ? ` - ${info.appleRelay} use Apple "Hide My Email" (they only receive mail if your sending domain is registered with Apple's private email relay)`
                : ""}
            </Text>
          </Flex>

          <HStack gap={2} wrap="wrap">
            <Text color="nexzy.gray.100" fontSize="xs">
              Start from:
            </Text>
            {TEMPLATES.map((t) => (
              <Button
                key={t.key}
                size="xs"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={() => applyTemplate(t.draft)}
              >
                {t.label}
              </Button>
            ))}
          </HStack>

          <Flex gap={4} wrap="wrap">
            <Box flex="1" minW="220px">
              <Label>From name</Label>
              <Input
                size="sm"
                {...inputProps}
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <Text color="whiteAlpha.600" fontSize="2xs" mt={1}>
                Sent from {summary.defaults.fromEmail || "(no address set)"}
              </Text>
            </Box>
            <Box flex="1" minW="220px">
              <Label>Reply-to (an inbox you read)</Label>
              <Input
                size="sm"
                {...inputProps}
                placeholder="you@yourdomain.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
              {asksForReply && !replyTo.trim() && (
                <Text color="orange.300" fontSize="2xs" mt={1}>
                  The email asks people to reply - set a reply-to inbox.
                </Text>
              )}
            </Box>
          </Flex>

          <Box>
            <Label>Subject</Label>
            <Input
              size="sm"
              {...inputProps}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setConfirming(false);
              }}
            />
          </Box>
          <Box>
            <Label>Preview text (shows next to the subject in the inbox)</Label>
            <Input
              size="sm"
              {...inputProps}
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
            />
          </Box>
          <Box>
            <Label>Message</Label>
            <Textarea
              {...inputProps}
              rows={16}
              fontSize="sm"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
            />
            <Text color="whiteAlpha.600" fontSize="2xs" mt={1}>
              Blank line = new paragraph. [Text](https://link) = a link. A line
              with only [Text](https://link) becomes a button. The unsubscribe
              link and mailing address are added automatically.
            </Text>
          </Box>

          <Flex gap={2} wrap="wrap">
            <Button
              size="sm"
              variant="outline"
              color="nexzy.gray.100"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={doPreview}
              loading={busy === "preview"}
              disabled={!filled}
            >
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="nexzy.gray.100"
              borderColor="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={doTest}
              loading={busy === "test"}
              loadingText="Sending test"
              disabled={!filled || !ready}
            >
              Send me a test
            </Button>
            <Button
              size="sm"
              bg={confirming ? "orange.500" : "nexzy.blue"}
              color="white"
              _hover={{ bg: confirming ? "orange.600" : "nexzy.blue" }}
              onClick={doSend}
              loading={busy === "send"}
              disabled={!filled || !ready || running || count === 0}
            >
              {confirming
                ? `Click again to send to ${count} people`
                : `Send to ${count} people`}
            </Button>
          </Flex>

          {msg && (
            <Text color={msg.ok ? "green.300" : "red.300"} fontSize="sm">
              {msg.text}
            </Text>
          )}

          {job && (
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              p={3}
            >
              <Text color="nexzy.white" fontSize="sm" fontWeight="600">
                {running ? "Sending" : "Last send"}: {job.subject}
              </Text>
              <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
                {job.sent} sent, {job.failed} failed, of {job.total} (
                {AUDIENCE_LABEL[job.audience]})
                {job.finishedAt
                  ? ` - finished ${new Date(job.finishedAt).toLocaleString()}`
                  : ""}
              </Text>
              {job.failures.length > 0 && (
                <Text color="red.300" fontSize="xs" mt={1}>
                  Failed: {job.failures.join(", ")}
                </Text>
              )}
            </Box>
          )}

          {previewHtml && (
            <Box>
              <Label>Preview (as you would receive it)</Label>
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                style={{
                  width: "100%",
                  height: 560,
                  background: "#fff",
                  border: 0,
                  borderRadius: 8,
                }}
              />
            </Box>
          )}
        </>
      )}
    </VStack>
  );
}
