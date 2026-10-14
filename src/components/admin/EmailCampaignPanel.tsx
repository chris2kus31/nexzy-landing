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
  getEmailStatus,
  getSendgridTemplates,
  previewEmail,
  sendEmailCampaign,
  sendTestEmail,
  type EmailAudience,
  type EmailAudienceSummary,
  type EmailDraft,
  type EmailJob,
  type EmailMode,
  type SendgridTemplate,
} from "@/lib/admin/client";
import { EMAIL_PRESETS, NEXZY_EMAIL_HTML } from "./emailTemplates";

/**
 * Marketing > Email: owner-only announcement emails. Three ways to build one:
 *  - Simple message (plain text with links/buttons)
 *  - Custom HTML (paste your own, or load the Nexzy design)
 *  - SendGrid template (design it in SendGrid, pick it here)
 * Everyone gets their own copy (nobody sees other addresses), a personal
 * unsubscribe link, and unsubscribed people are skipped.
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

const MODES: { key: EmailMode; label: string }[] = [
  { key: "text", label: "Simple message" },
  { key: "html", label: "Custom HTML" },
  { key: "sendgrid", label: "SendGrid template" },
];

const AUTO_VARS = ["subject", "preheader", "unsubscribe_url"];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600" mb={1}>
      {children}
    </Text>
  );
}

function OutlineBtn(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="xs"
      variant="outline"
      color="nexzy.gray.100"
      borderColor="whiteAlpha.300"
      _hover={{ bg: "whiteAlpha.100" }}
      {...props}
    />
  );
}

/** Editable list of template variables ({{key}} -> value). */
function DataEditor({
  data,
  setData,
}: {
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const entries = Object.entries(data);
  return (
    <Box>
      <Label>Template variables</Label>
      <Text color="whiteAlpha.600" fontSize="2xs" mb={2}>
        Each one fills {"{{name}}"} in the template.{" "}
        {AUTO_VARS.map((v) => `{{${v}}}`).join(", ")} are filled automatically.
      </Text>
      <VStack align="stretch" gap={2}>
        {entries.length === 0 && (
          <Text color="whiteAlpha.600" fontSize="xs">
            No variables yet. Load a preset or add one.
          </Text>
        )}
        {entries.map(([k, v]) => (
          <Flex key={k} gap={2} align="flex-start">
            <Text
              color="nexzy.lightBlue"
              fontSize="xs"
              fontFamily="mono"
              w="140px"
              flexShrink={0}
              pt={2}
            >
              {`{{${k}}}`}
            </Text>
            <Textarea
              {...inputProps}
              size="sm"
              rows={v.length > 70 ? 3 : 1}
              value={v}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
            <OutlineBtn
              mt={1}
              onClick={() => {
                const next = { ...data };
                delete next[k];
                setData(next);
              }}
            >
              Remove
            </OutlineBtn>
          </Flex>
        ))}
        <Flex gap={2}>
          <Input
            {...inputProps}
            size="sm"
            maxW="220px"
            placeholder="new_variable"
            value={newKey}
            onChange={(e) =>
              setNewKey(e.target.value.replace(/[^\w.]/g, "").slice(0, 64))
            }
          />
          <OutlineBtn
            mt={1}
            disabled={!newKey || newKey in data || AUTO_VARS.includes(newKey)}
            onClick={() => {
              setData({ ...data, [newKey]: "" });
              setNewKey("");
            }}
          >
            Add variable
          </OutlineBtn>
        </Flex>
      </VStack>
    </Box>
  );
}

export default function EmailCampaignPanel() {
  const [summary, setSummary] = useState<EmailAudienceSummary | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [audience, setAudience] = useState<EmailAudience>("both");
  const [mode, setMode] = useState<EmailMode>("text");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [data, setData] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState("");
  const [sgTemplates, setSgTemplates] = useState<SendgridTemplate[] | null>(
    null,
  );
  const [sgErr, setSgErr] = useState("");
  const [preview, setPreview] = useState<{
    html: string;
    subject: string;
    warnings: string[];
  } | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "test" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<EmailJob | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Load the SendGrid template list the first time that mode is opened.
  useEffect(() => {
    if (mode !== "sendgrid" || sgTemplates !== null) return;
    getSendgridTemplates()
      .then((r) => {
        setSgTemplates(r.templates);
        setSgErr(r.ok ? "" : r.error || "Could not list templates.");
      })
      .catch((e) => {
        setSgTemplates([]);
        setSgErr((e as Error)?.message || "Could not list templates.");
      });
  }, [mode, sgTemplates]);

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
    preheader,
    fromName,
    replyTo,
    mode,
    ...(mode === "text" ? { body } : {}),
    ...(mode === "html" ? { html, data } : {}),
    ...(mode === "sendgrid" ? { templateId: templateId.trim(), data } : {}),
  });

  const count = summary?.audiences[audience]?.count ?? 0;
  const info = summary?.audiences[audience];
  const ready = !!summary?.defaults.unsubscribeReady;
  const sendgridReady = !!summary?.defaults.sendgridReady;
  const contentReady =
    mode === "text"
      ? body.trim().length > 0
      : mode === "html"
        ? html.trim().length > 0
        : /^d-[a-z0-9]{10,}$/i.test(templateId.trim()) && sendgridReady;
  const filled = subject.trim().length > 0 && contentReady;
  const asksForReply = /reply/i.test(
    mode === "text" ? body : Object.values(data).join(" "),
  );
  const invalidate = () => {
    setConfirming(false);
    setPreview(null);
  };

  const applyPreset = (key: string, withDesign: boolean) => {
    const p = EMAIL_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setSubject(p.subject);
    setPreheader(p.preheader);
    setBody(p.body);
    setData({ ...p.data });
    if (withDesign) setHtml(NEXZY_EMAIL_HTML);
    invalidate();
    setMsg(null);
  };

  const copyDesign = async () => {
    try {
      await navigator.clipboard.writeText(NEXZY_EMAIL_HTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg({ ok: false, text: "Could not copy - your browser blocked it." });
    }
  };

  const doPreview = async () => {
    setBusy("preview");
    setMsg(null);
    try {
      const r = await previewEmail(draft());
      setPreview({
        html: r.html,
        subject: r.subject,
        warnings: r.warnings ?? [],
      });
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
          Everyone gets their own copy: they see Nexzy as the sender and only
          their own address. Each email has a personal unsubscribe link, and
          anyone who unsubscribed is skipped.
        </Text>
      </Box>

      {loadErr && (
        <Text color="red.300" fontSize="sm">
          {loadErr}
        </Text>
      )}
      {!summary && !loadErr && <Spinner color="nexzy.blue" />}

      {summary && !ready && (
        <Text color="red.300" fontSize="sm">
          Set EMAIL_UNSUB_SECRET on the API (unsubscribe links need it).
        </Text>
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

          <Box>
            <Label>Build the email with</Label>
            <HStack gap={2} wrap="wrap">
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <Button
                    key={m.key}
                    size="sm"
                    bg={active ? "nexzy.blue" : "transparent"}
                    color={active ? "white" : "nexzy.gray.100"}
                    borderWidth="1px"
                    borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
                    _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
                    onClick={() => {
                      setMode(m.key);
                      invalidate();
                    }}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </HStack>
          </Box>

          <HStack gap={2} wrap="wrap">
            <Text color="nexzy.gray.100" fontSize="xs">
              Load preset:
            </Text>
            {EMAIL_PRESETS.map((p) => (
              <OutlineBtn
                key={p.key}
                onClick={() => applyPreset(p.key, mode === "html")}
              >
                {p.label}
              </OutlineBtn>
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
                placeholder="support@nexzyapp.com"
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
                invalidate();
              }}
            />
          </Box>
          <Box>
            <Label>Preview text (shows next to the subject in the inbox)</Label>
            <Input
              size="sm"
              {...inputProps}
              value={preheader}
              onChange={(e) => {
                setPreheader(e.target.value);
                invalidate();
              }}
            />
          </Box>

          {mode === "text" && (
            <Box>
              <Label>Message</Label>
              <Textarea
                {...inputProps}
                rows={16}
                fontSize="sm"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  invalidate();
                }}
              />
              <Text color="whiteAlpha.600" fontSize="2xs" mt={1}>
                Blank line = new paragraph. [Text](https://link) = a link. A
                line with only [Text](https://link) becomes a button. The
                unsubscribe link is added automatically.
              </Text>
            </Box>
          )}

          {mode === "html" && (
            <>
              <Box>
                <Flex justify="space-between" align="center" mb={1} gap={2}>
                  <Label>HTML</Label>
                  <OutlineBtn
                    onClick={() => {
                      setHtml(NEXZY_EMAIL_HTML);
                      invalidate();
                    }}
                  >
                    Load the Nexzy design
                  </OutlineBtn>
                </Flex>
                <Textarea
                  {...inputProps}
                  rows={14}
                  fontSize="xs"
                  fontFamily="mono"
                  placeholder="Paste a full HTML email, or load the Nexzy design."
                  value={html}
                  onChange={(e) => {
                    setHtml(e.target.value);
                    invalidate();
                  }}
                />
                <Text color="whiteAlpha.600" fontSize="2xs" mt={1}>
                  Use {"{{variable}}"} for values below ({"{{{variable}}}"}{" "}
                  inserts raw HTML). Put {"{{unsubscribe_url}}"} where you want
                  the unsubscribe link; if it is missing, a standard footer is
                  added.
                </Text>
              </Box>
              <DataEditor
                data={data}
                setData={(d) => {
                  setData(d);
                  invalidate();
                }}
              />
            </>
          )}

          {mode === "sendgrid" && (
            <>
              <Box
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                p={3}
                bg="whiteAlpha.50"
              >
                <Text color="nexzy.white" fontSize="sm" fontWeight="600" mb={1}>
                  How SendGrid templates work here
                </Text>
                <Text color="nexzy.gray.100" fontSize="xs" lineHeight="1.6">
                  1. In SendGrid: Email API, then Dynamic Templates, then Create
                  a Dynamic Template. Add a version with the Code Editor (or the
                  Design Editor).
                  <br />
                  2. Set the version Subject to {"{{subject}}"} so the subject
                  here is used, and include a link to {"{{unsubscribe_url}}"}.
                  <br />
                  3. Pick the template below, fill the variables, Preview, send
                  yourself a test, then send.
                </Text>
                <HStack mt={2} gap={2}>
                  <OutlineBtn onClick={copyDesign}>
                    {copied
                      ? "Copied - paste it into SendGrid's Code Editor"
                      : "Copy the Nexzy design HTML"}
                  </OutlineBtn>
                </HStack>
              </Box>

              {!sendgridReady && (
                <Text color="red.300" fontSize="sm">
                  No SendGrid API key found on the API. Set SENDGRID_API_KEY (an
                  API key with Mail Send + Template Engine access).
                </Text>
              )}

              <Box>
                <Label>SendGrid template</Label>
                {sgTemplates === null && sendgridReady ? (
                  <Spinner size="sm" color="nexzy.blue" />
                ) : (
                  <Flex gap={3} wrap="wrap" align="center">
                    {sgTemplates && sgTemplates.length > 0 && (
                      <select
                        style={SELECT_STYLE}
                        value={
                          sgTemplates.some((t) => t.id === templateId)
                            ? templateId
                            : ""
                        }
                        onChange={(e) => {
                          setTemplateId(e.target.value);
                          invalidate();
                        }}
                      >
                        <option value="">Choose a template</option>
                        {sgTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.activeVersion ? "" : " (no active version)"}
                          </option>
                        ))}
                      </select>
                    )}
                    <Input
                      size="sm"
                      {...inputProps}
                      maxW="360px"
                      fontFamily="mono"
                      placeholder="or paste a template ID (d-...)"
                      value={templateId}
                      onChange={(e) => {
                        setTemplateId(e.target.value.trim());
                        invalidate();
                      }}
                    />
                    <OutlineBtn onClick={() => setSgTemplates(null)}>
                      Refresh list
                    </OutlineBtn>
                  </Flex>
                )}
                {sgErr && (
                  <Text color="orange.300" fontSize="2xs" mt={1}>
                    {sgErr}
                  </Text>
                )}
              </Box>
              <DataEditor
                data={data}
                setData={(d) => {
                  setData(d);
                  invalidate();
                }}
              />
            </>
          )}

          <Flex gap={2} wrap="wrap">
            <OutlineBtn
              size="sm"
              onClick={doPreview}
              loading={busy === "preview"}
              disabled={!filled}
            >
              Preview
            </OutlineBtn>
            <OutlineBtn
              size="sm"
              onClick={doTest}
              loading={busy === "test"}
              loadingText="Sending test"
              disabled={!filled || !ready}
            >
              Send me a test
            </OutlineBtn>
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

          {preview && (
            <Box>
              <Label>Preview - subject: {preview.subject}</Label>
              {preview.warnings.map((w, i) => (
                <Text key={i} color="orange.300" fontSize="xs" mb={1}>
                  {w}
                </Text>
              ))}
              {preview.html && (
                <iframe
                  title="Email preview"
                  srcDoc={preview.html}
                  sandbox=""
                  style={{
                    width: "100%",
                    height: 640,
                    background: "#fff",
                    border: 0,
                    borderRadius: 8,
                  }}
                />
              )}
            </Box>
          )}
        </>
      )}
    </VStack>
  );
}
