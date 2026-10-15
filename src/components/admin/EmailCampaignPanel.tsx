"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FiAlertCircle,
  FiCheckCircle,
  FiCircle,
  FiMonitor,
  FiRefreshCw,
  FiRotateCcw,
  FiSmartphone,
  FiUpload,
} from "react-icons/fi";
import {
  checkEmailList,
  getEmailAudience,
  getEmailStatus,
  getSendgridTemplates,
  previewEmail,
  sendEmailCampaign,
  sendTestEmail,
  sendWelcomeTestEmail,
  type EmailAudience,
  type EmailAudienceSummary,
  type EmailDraft,
  type EmailJob,
  type EmailListAudience,
  type EmailListCheck,
  type EmailMode,
  type SendgridTemplate,
} from "@/lib/admin/client";
import { EMAIL_PRESETS, NEXZY_EMAIL_HTML } from "./emailTemplates";

/**
 * Marketing > Email: owner-only announcement emails, laid out as steps
 * (recipients, content, sender + subject, test, send) with a live preview.
 *
 * Content: Simple message, Custom HTML (paste, upload or load the Nexzy
 * design), or a SendGrid Dynamic Template. Recipients: a saved audience or a
 * pasted list of specific addresses. Everyone gets their own copy (nobody
 * sees other addresses) with a personal unsubscribe link; unsubscribed people
 * are always skipped. The draft autosaves in this browser.
 */

const DRAFT_KEY = "nexzy.admin.emailDraft.v1";
const AUTO_VARS = ["subject", "preheader", "unsubscribe_url"];
const VAR_RE = /\{\{\{?\s*([A-Za-z_][\w.]*)\s*\}?\}\}/g;
const TEMPLATE_ID_RE = /^d-[a-z0-9]{10,}$/i;
const MAX_HTML_BYTES = 200 * 1024;
const GMAIL_CLIP_BYTES = 102 * 1024;

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
  maxWidth: "100%",
};

const AUDIENCE_LABEL: Record<EmailAudience, string> = {
  both: "Everyone (app users + subscribers)",
  users: "App users",
  subscribers: "Newsletter subscribers",
  custom: "Specific emails",
};

const MODES: { key: EmailMode; label: string; hint: string }[] = [
  {
    key: "text",
    label: "Simple message",
    hint: "Write text with links and buttons. Quick one-offs.",
  },
  {
    key: "html",
    label: "Custom HTML",
    hint: "Paste or upload your own HTML, or start from the Nexzy design.",
  },
  {
    key: "sendgrid",
    label: "SendGrid template",
    hint: "Design in SendGrid, pick it here. Edit the design without a deploy.",
  },
];

function bytes(s: string): number {
  return new Blob([s]).size;
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

function varsIn(...sources: string[]): string[] {
  const out = new Set<string>();
  for (const src of sources) {
    for (const m of (src || "").matchAll(VAR_RE)) {
      if (!AUTO_VARS.includes(m[1])) out.add(m[1]);
    }
  }
  return [...out];
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text color="nexzy.gray.100" fontSize="xs" fontWeight="600" mb={1}>
      {children}
    </Text>
  );
}

function Hint({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "warn" | "error" | "ok";
}) {
  const color =
    tone === "warn"
      ? "orange.300"
      : tone === "error"
        ? "red.300"
        : tone === "ok"
          ? "green.300"
          : "whiteAlpha.600";
  return (
    <Text color={color} fontSize="2xs" mt={1} lineHeight="1.5">
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

function PrimaryBtn(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="sm"
      bg="nexzy.blue"
      color="white"
      _hover={{ bg: "#0069d9" }}
      _disabled={{ bg: "whiteAlpha.200", color: "whiteAlpha.600" }}
      {...props}
    />
  );
}

/** Pill buttons; the active one is solid blue with white text. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <HStack gap={2} wrap="wrap">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Button
            key={o.key}
            size="sm"
            bg={active ? "nexzy.blue" : "transparent"}
            color={active ? "white" : "nexzy.gray.100"}
            borderWidth="1px"
            borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
            _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </Button>
        );
      })}
    </HStack>
  );
}

function StepCard({
  n,
  title,
  done,
  right,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="whiteAlpha.50"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={{ base: 3, md: 4 }}
    >
      <Flex justify="space-between" align="center" mb={3} gap={3}>
        <HStack gap={2}>
          <Flex
            w="24px"
            h="24px"
            borderRadius="full"
            align="center"
            justify="center"
            fontSize="xs"
            fontWeight="700"
            bg={done ? "green.500" : "whiteAlpha.200"}
            color="white"
            flexShrink={0}
          >
            {n}
          </Flex>
          <Text color="nexzy.white" fontWeight="700" fontSize="sm">
            {title}
          </Text>
        </HStack>
        {right}
      </Flex>
      <VStack align="stretch" gap={3}>
        {children}
      </VStack>
    </Box>
  );
}

/** One line of the pre-send checklist. */
function Check({
  state,
  children,
}: {
  state: "ok" | "todo" | "warn";
  children: React.ReactNode;
}) {
  const Icon =
    state === "ok"
      ? FiCheckCircle
      : state === "warn"
        ? FiAlertCircle
        : FiCircle;
  const color =
    state === "ok"
      ? "green.300"
      : state === "warn"
        ? "orange.300"
        : "whiteAlpha.500";
  return (
    <HStack gap={2} align="flex-start">
      <Box color={color} pt="2px" flexShrink={0}>
        <Icon size={14} />
      </Box>
      <Text color="nexzy.gray.100" fontSize="xs">
        {children}
      </Text>
    </HStack>
  );
}

/**
 * Template variables. Names found in the template are listed automatically
 * (an empty one is flagged); extra names you add can be removed.
 */
function VariablesEditor({
  data,
  setData,
  detected,
  detectedKnown,
}: {
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
  /** Names the template uses. */
  detected: string[];
  /** False until we've read the template (SendGrid: after the preview loads). */
  detectedKnown: boolean;
}) {
  const [newKey, setNewKey] = useState("");
  const names = [
    ...detected,
    ...Object.keys(data).filter((k) => !detected.includes(k)),
  ];
  return (
    <Box>
      <Label>Template variables</Label>
      <Hint>
        Each value fills {"{{name}}"} in the template.{" "}
        {AUTO_VARS.map((v) => `{{${v}}}`).join(", ")} are filled for you.
      </Hint>
      <VStack align="stretch" gap={2} mt={2}>
        {names.length === 0 && (
          <Text color="whiteAlpha.600" fontSize="xs">
            {detectedKnown
              ? "This template has no variables to fill."
              : "Variables show up here once the preview loads."}
          </Text>
        )}
        {names.map((k) => {
          const used = detected.includes(k);
          const v = data[k] ?? "";
          return (
            <Flex
              key={k}
              gap={2}
              align="flex-start"
              direction={{ base: "column", md: "row" }}
            >
              <Box w={{ base: "auto", md: "150px" }} flexShrink={0} pt={2}>
                <Text color="nexzy.lightBlue" fontSize="xs" fontFamily="mono">
                  {`{{${k}}}`}
                </Text>
                {used && !v.trim() && (
                  <Text color="orange.300" fontSize="2xs">
                    empty
                  </Text>
                )}
                {!used && detectedKnown && (
                  <Text color="whiteAlpha.500" fontSize="2xs">
                    not in template
                  </Text>
                )}
              </Box>
              <Textarea
                {...inputProps}
                size="sm"
                rows={v.length > 70 ? 3 : 1}
                value={v}
                onChange={(e) => setData({ ...data, [k]: e.target.value })}
              />
              {!used && (
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
              )}
            </Flex>
          );
        })}
        <Flex gap={2}>
          <Input
            {...inputProps}
            size="sm"
            maxW="220px"
            placeholder="add_variable"
            value={newKey}
            onChange={(e) =>
              setNewKey(e.target.value.replace(/[^\w.]/g, "").slice(0, 64))
            }
          />
          <OutlineBtn
            mt={1}
            disabled={
              !newKey || names.includes(newKey) || AUTO_VARS.includes(newKey)
            }
            onClick={() => {
              setData({ ...data, [newKey]: "" });
              setNewKey("");
            }}
          >
            Add
          </OutlineBtn>
        </Flex>
      </VStack>
    </Box>
  );
}

interface SavedDraft {
  audience?: EmailAudience;
  customEmails?: string;
  mode?: EmailMode;
  fromName?: string;
  replyTo?: string;
  subject?: string;
  preheader?: string;
  body?: string;
  html?: string;
  data?: Record<string, string>;
  templateId?: string;
  testTo?: string;
}

export default function EmailCampaignPanel() {
  const [summary, setSummary] = useState<EmailAudienceSummary | null>(null);
  const [loadErr, setLoadErr] = useState("");

  // Recipients
  const [audience, setAudience] = useState<EmailAudience>("both");
  const [customEmails, setCustomEmails] = useState("");
  const [listCheck, setListCheck] = useState<{
    text: string;
    result: EmailListCheck;
  } | null>(null);
  const [listErr, setListErr] = useState("");

  // Content
  const [mode, setMode] = useState<EmailMode>("html");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [data, setData] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState("");
  const [sgTemplates, setSgTemplates] = useState<SendgridTemplate[] | null>(
    null,
  );
  const [sgErr, setSgErr] = useState("");
  const [showSgHelp, setShowSgHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Sender + subject
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");

  // Preview
  const [preview, setPreview] = useState<{
    sig: string;
    html: string;
    subject: string;
    warnings: string[];
    variables: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // Test + send
  const [testTo, setTestTo] = useState("");
  const [testSig, setTestSig] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<"" | "test" | "send" | "welcome">("");
  const [welcomeMsg, setWelcomeMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [job, setJob] = useState<EmailJob | null>(null);
  const [running, setRunning] = useState(false);

  const hydrated = useRef(false);

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

  // Restore the autosaved draft, then load the audience + any running send.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as SavedDraft;
        if (d.audience) setAudience(d.audience);
        if (d.customEmails) setCustomEmails(d.customEmails);
        if (d.mode) setMode(d.mode);
        if (d.fromName) setFromName(d.fromName);
        if (d.replyTo) setReplyTo(d.replyTo);
        if (d.subject) setSubject(d.subject);
        if (d.preheader) setPreheader(d.preheader);
        if (d.body) setBody(d.body);
        if (d.html) setHtml(d.html);
        if (d.data) setData(d.data);
        if (d.templateId) setTemplateId(d.templateId);
        if (d.testTo) setTestTo(d.testTo);
      }
    } catch {
      /* storage unavailable - start blank */
    }
    hydrated.current = true;
    load();
    getEmailStatus()
      .then((st) => {
        setRunning(st.running);
        setJob(st.job);
      })
      .catch(() => {});
  }, [load]);

  // Autosave the draft in this browser.
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      try {
        const d: SavedDraft = {
          audience,
          customEmails,
          mode,
          fromName,
          replyTo,
          subject,
          preheader,
          body,
          html,
          data,
          templateId,
          testTo,
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch {
        /* storage full or blocked - fine */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [
    audience,
    customEmails,
    mode,
    fromName,
    replyTo,
    subject,
    preheader,
    body,
    html,
    data,
    templateId,
    testTo,
  ]);

  // SendGrid template list, the first time that mode is opened.
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

  // Check a pasted list (valid / invalid / unsubscribed), debounced.
  useEffect(() => {
    if (audience !== "custom") return;
    const text = customEmails;
    if (!text.trim()) {
      setListCheck(null);
      setListErr("");
      return;
    }
    const t = setTimeout(async () => {
      try {
        const result = await checkEmailList(text);
        setListCheck({ text, result });
        setListErr("");
      } catch (e) {
        setListErr((e as Error)?.message || "Could not check the list.");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [audience, customEmails]);

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

  const draft = useCallback(
    (): EmailDraft => ({
      subject,
      preheader,
      fromName,
      replyTo,
      mode,
      ...(mode === "text" ? { body } : {}),
      ...(mode === "html" ? { html, data } : {}),
      ...(mode === "sendgrid" ? { templateId: templateId.trim(), data } : {}),
    }),
    [subject, preheader, fromName, replyTo, mode, body, html, data, templateId],
  );
  const sig = useMemo(() => JSON.stringify(draft()), [draft]);

  const sendgridReady = !!summary?.defaults.sendgridReady;
  const unsubReady = !!summary?.defaults.unsubscribeReady;
  const htmlBytes = useMemo(() => bytes(html), [html]);
  const contentReady =
    mode === "text"
      ? body.trim().length > 0
      : mode === "html"
        ? html.trim().length > 0 && htmlBytes <= MAX_HTML_BYTES
        : TEMPLATE_ID_RE.test(templateId.trim()) && sendgridReady;

  // Live preview: re-render (debounced) whenever the content changes.
  useEffect(() => {
    if (!summary || !contentReady) {
      setPreview(null);
      setPreviewErr("");
      return;
    }
    const current = sig;
    const t = setTimeout(
      async () => {
        setPreviewLoading(true);
        try {
          const r = await previewEmail(JSON.parse(current) as EmailDraft);
          setPreview({
            sig: current,
            html: r.html,
            subject: r.subject,
            warnings: r.warnings ?? [],
            variables: r.variables ?? [],
          });
          setPreviewErr("");
        } catch (e) {
          setPreviewErr((e as Error)?.message || "Preview failed.");
        } finally {
          setPreviewLoading(false);
        }
      },
      mode === "sendgrid" ? 900 : 600,
    );
    return () => clearTimeout(t);
  }, [sig, summary, contentReady, mode]);

  const refreshPreview = () => {
    if (!contentReady) return;
    setPreviewLoading(true);
    previewEmail(draft())
      .then((r) => {
        setPreview({
          sig,
          html: r.html,
          subject: r.subject,
          warnings: r.warnings ?? [],
          variables: r.variables ?? [],
        });
        setPreviewErr("");
      })
      .catch((e) => setPreviewErr((e as Error)?.message || "Preview failed."))
      .finally(() => setPreviewLoading(false));
  };

  // Recipients count for the current choice.
  const listFresh =
    audience !== "custom" || (!!listCheck && listCheck.text === customEmails);
  const count =
    audience === "custom"
      ? listFresh && listCheck
        ? listCheck.result.count
        : 0
      : (summary?.audiences[audience as EmailListAudience]?.count ?? 0);
  const maxRecipients = listCheck?.result.max ?? 2000;

  const detectedVars = useMemo(() => {
    if (mode === "html") return varsIn(html);
    if (mode === "sendgrid") return preview?.variables ?? [];
    return [];
  }, [mode, html, preview]);
  const emptyVars = detectedVars.filter((k) => !(data[k] ?? "").trim());

  const asksForReply = /reply/i.test(
    mode === "text" ? body : Object.values(data).join(" ") + html,
  );
  const testedCurrent = testSig === sig;

  const blockers: string[] = [];
  if (!unsubReady) blockers.push("Set EMAIL_UNSUB_SECRET on the API.");
  if (audience === "custom" && !customEmails.trim())
    blockers.push("Add at least one email address.");
  else if (audience === "custom" && !listFresh)
    blockers.push("Checking the address list...");
  else if (count === 0)
    blockers.push("Nobody in this audience can receive it.");
  if (audience === "custom" && count > maxRecipients)
    blockers.push(`That is more than the ${maxRecipients} limit.`);
  if (!contentReady)
    blockers.push(
      mode === "text"
        ? "Write the message."
        : mode === "html"
          ? htmlBytes > MAX_HTML_BYTES
            ? "The HTML is over 200 KB."
            : "Add the HTML."
          : !sendgridReady
            ? "No SendGrid API key on the API."
            : "Pick a SendGrid template.",
    );
  if (!subject.trim()) blockers.push("Add a subject.");
  const canSend = blockers.length === 0 && !running;
  const canTest = unsubReady && contentReady && !!subject.trim();

  const applyPreset = (key: string) => {
    const p = EMAIL_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setSubject(p.subject);
    setPreheader(p.preheader);
    if (mode === "text") setBody(p.body);
    if (mode === "html") {
      setHtml(NEXZY_EMAIL_HTML);
      setData({ ...p.data });
    }
  };

  const startOver = () => {
    setAudience("both");
    setCustomEmails("");
    setListCheck(null);
    setSubject("");
    setPreheader("");
    setBody("");
    setHtml("");
    setData({});
    setTemplateId("");
    setTestTo("");
    setTestSig("");
    setTestMsg(null);
    setSendMsg(null);
    setConfirmOpen(false);
    setFromName(summary?.defaults.fromName ?? "");
    setReplyTo(summary?.defaults.replyTo ?? "");
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_HTML_BYTES) {
      setUploadErr("That file is over 200 KB.");
      return;
    }
    setUploadErr("");
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result || ""));
    reader.onerror = () => setUploadErr("Could not read that file.");
    reader.readAsText(file);
  };

  const copyDesign = async () => {
    try {
      await navigator.clipboard.writeText(NEXZY_EMAIL_HTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setSgErr("Could not copy - your browser blocked it.");
    }
  };

  const doTest = async () => {
    setBusy("test");
    setTestMsg(null);
    try {
      const r = await sendTestEmail(draft(), testTo);
      setTestSig(sig);
      setTestMsg({ ok: true, text: `Test sent to ${r.to}. Check the inbox.` });
    } catch (e) {
      setTestMsg({ ok: false, text: (e as Error)?.message || "Test failed." });
    } finally {
      setBusy("");
    }
  };

  const doWelcomeTest = async () => {
    setBusy("welcome");
    setWelcomeMsg(null);
    try {
      const r = await sendWelcomeTestEmail(testTo);
      setWelcomeMsg({ ok: true, text: `Welcome email sent to ${r.to}.` });
    } catch (e) {
      setWelcomeMsg({
        ok: false,
        text: (e as Error)?.message || "Welcome test failed.",
      });
    } finally {
      setBusy("");
    }
  };

  const doSend = async () => {
    setBusy("send");
    setSendMsg(null);
    try {
      const r = await sendEmailCampaign({
        ...draft(),
        audience,
        expectedCount: count,
        ...(audience === "custom" ? { emails: customEmails } : {}),
      });
      setJob(r.job);
      setRunning(r.running);
      setConfirmOpen(false);
    } catch (e) {
      setSendMsg({ ok: false, text: (e as Error)?.message || "Send failed." });
      load();
    } finally {
      setBusy("");
    }
  };

  const modeLabel = MODES.find((m) => m.key === mode)?.label ?? mode;
  const subjLen = subject.trim().length;
  const preLen = preheader.trim().length;
  const progress =
    job && job.total ? ((job.sent + job.failed) / job.total) * 100 : 0;
  const templateName =
    sgTemplates?.find((t) => t.id === templateId.trim())?.name ?? "";

  return (
    <VStack align="stretch" gap={4}>
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box maxW="760px">
          <Heading size="sm" color="nexzy.white" mb={1}>
            Email
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            Everyone gets their own copy: they see Nexzy as the sender and only
            their own address. Each email has a personal unsubscribe link, and
            anyone who unsubscribed is skipped.
          </Text>
        </Box>
        <HStack gap={2}>
          <Text color="whiteAlpha.500" fontSize="2xs">
            Draft saves in this browser
          </Text>
          <OutlineBtn onClick={startOver}>
            <FiRotateCcw /> Start over
          </OutlineBtn>
        </HStack>
      </Flex>

      {loadErr && (
        <Text color="red.300" fontSize="sm">
          {loadErr}
        </Text>
      )}
      {!summary && !loadErr && <Spinner color="nexzy.blue" />}

      {summary && (
        <Box
          display="grid"
          gridTemplateColumns={{
            base: "minmax(0,1fr)",
            xl: "minmax(0,1fr) minmax(0,540px)",
          }}
          gap={5}
          alignItems="start"
        >
          {/* ---------------- LEFT: steps ---------------- */}
          <VStack align="stretch" gap={4} minW={0}>
            {/* 1. Recipients */}
            <StepCard
              n={1}
              title="Who gets it"
              done={count > 0 && listFresh}
              right={
                <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                  {audience === "custom" && !listFresh ? "..." : count} people
                </Text>
              }
            >
              <Segmented<EmailAudience>
                value={audience}
                onChange={(a) => {
                  setAudience(a);
                  setConfirmOpen(false);
                }}
                options={[
                  ...(
                    ["both", "users", "subscribers"] as EmailListAudience[]
                  ).map((a) => ({
                    key: a as EmailAudience,
                    label: `${AUDIENCE_LABEL[a]} (${summary.audiences[a].count})`,
                  })),
                  { key: "custom", label: AUDIENCE_LABEL.custom },
                ]}
              />
              {audience !== "custom" ? (
                <Hint>
                  {summary.audiences[audience as EmailListAudience].suppressed >
                  0
                    ? `${summary.audiences[audience as EmailListAudience].suppressed} unsubscribed people are skipped. `
                    : ""}
                  {summary.audiences[audience as EmailListAudience].appleRelay >
                  0
                    ? `${summary.audiences[audience as EmailListAudience].appleRelay} use Apple "Hide My Email"; they only get it if your sending domain is registered with Apple's private email relay.`
                    : ""}
                </Hint>
              ) : (
                <Box>
                  <Label>Email addresses</Label>
                  <Textarea
                    {...inputProps}
                    rows={5}
                    fontSize="sm"
                    placeholder={
                      "one@example.com, two@example.com\nor one per line"
                    }
                    value={customEmails}
                    onChange={(e) => {
                      setCustomEmails(e.target.value);
                      setConfirmOpen(false);
                    }}
                  />
                  {listErr && <Hint tone="error">{listErr}</Hint>}
                  {listCheck && listFresh && (
                    <>
                      <Hint tone={listCheck.result.count > 0 ? "ok" : "warn"}>
                        {listCheck.result.count} will get it
                        {listCheck.result.duplicates > 0
                          ? ` - ${listCheck.result.duplicates} duplicate${listCheck.result.duplicates === 1 ? "" : "s"} removed`
                          : ""}
                      </Hint>
                      {listCheck.result.unsubscribedCount > 0 && (
                        <Hint tone="warn">
                          Skipped, unsubscribed:{" "}
                          {listCheck.result.unsubscribed.join(", ")}
                          {listCheck.result.unsubscribedCount >
                          listCheck.result.unsubscribed.length
                            ? " ..."
                            : ""}
                        </Hint>
                      )}
                      {listCheck.result.invalid.length > 0 && (
                        <Hint tone="error">
                          Not valid (ignored):{" "}
                          {listCheck.result.invalid.join(", ")}
                        </Hint>
                      )}
                    </>
                  )}
                  <Hint>
                    Separate with commas or new lines. Each person still gets
                    their own copy.
                  </Hint>
                </Box>
              )}
            </StepCard>

            {/* 2. Content */}
            <StepCard n={2} title="Build the email" done={contentReady}>
              <Segmented<EmailMode>
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setConfirmOpen(false);
                }}
                options={MODES.map((m) => ({ key: m.key, label: m.label }))}
              />
              <Hint>{MODES.find((m) => m.key === mode)?.hint}</Hint>

              <HStack gap={2} wrap="wrap">
                <Text color="nexzy.gray.100" fontSize="xs">
                  Start from:
                </Text>
                {EMAIL_PRESETS.map((p) => (
                  <OutlineBtn key={p.key} onClick={() => applyPreset(p.key)}>
                    {p.label}
                  </OutlineBtn>
                ))}
              </HStack>

              {mode === "text" && (
                <Box>
                  <Label>Message</Label>
                  <Textarea
                    {...inputProps}
                    rows={14}
                    fontSize="sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <Hint>
                    Blank line = new paragraph. [Text](https://link) = a link. A
                    line with only [Text](https://link) becomes a button. The
                    unsubscribe link is added for you.
                  </Hint>
                </Box>
              )}

              {mode === "html" && (
                <>
                  <Box>
                    <Flex
                      justify="space-between"
                      align="center"
                      mb={1}
                      gap={2}
                      wrap="wrap"
                    >
                      <Label>HTML</Label>
                      <HStack gap={2} wrap="wrap">
                        <OutlineBtn onClick={() => setHtml(NEXZY_EMAIL_HTML)}>
                          Load the Nexzy design
                        </OutlineBtn>
                        <OutlineBtn onClick={() => fileRef.current?.click()}>
                          <FiUpload /> Upload .html
                        </OutlineBtn>
                        <OutlineBtn
                          disabled={!html}
                          onClick={() => {
                            setHtml("");
                            setData({});
                          }}
                        >
                          Clear
                        </OutlineBtn>
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".html,.htm,text/html"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            onUpload(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </HStack>
                    </Flex>
                    <Textarea
                      {...inputProps}
                      rows={16}
                      fontSize="xs"
                      fontFamily="mono"
                      spellCheck={false}
                      placeholder="Paste a full HTML email, upload a file, or load the Nexzy design."
                      value={html}
                      onChange={(e) => setHtml(e.target.value)}
                    />
                    {uploadErr && <Hint tone="error">{uploadErr}</Hint>}
                    <Flex justify="space-between" gap={2} wrap="wrap">
                      <Hint>
                        {"{{name}}"} fills a variable below ({"{{{name}}}"}{" "}
                        inserts raw HTML). Put {"{{unsubscribe_url}}"} where the
                        unsubscribe link goes; if it is missing, a footer is
                        added.
                      </Hint>
                      {html && (
                        <Hint
                          tone={
                            htmlBytes > MAX_HTML_BYTES
                              ? "error"
                              : htmlBytes > GMAIL_CLIP_BYTES
                                ? "warn"
                                : "muted"
                          }
                        >
                          {kb(htmlBytes)}
                          {htmlBytes > GMAIL_CLIP_BYTES &&
                          htmlBytes <= MAX_HTML_BYTES
                            ? " - Gmail cuts off emails over 102 KB"
                            : ""}
                        </Hint>
                      )}
                    </Flex>
                  </Box>
                  <VariablesEditor
                    data={data}
                    setData={setData}
                    detected={detectedVars}
                    detectedKnown
                  />
                </>
              )}

              {mode === "sendgrid" && (
                <>
                  {!sendgridReady && (
                    <Text color="red.300" fontSize="sm">
                      No SendGrid API key on the API. Set SENDGRID_API_KEY, or
                      use SendGrid SMTP with the &quot;apikey&quot; login.
                    </Text>
                  )}
                  <Box>
                    <Label>Template</Label>
                    {sgTemplates === null && sendgridReady ? (
                      <Spinner size="sm" color="nexzy.blue" />
                    ) : (
                      <Flex gap={2} wrap="wrap" align="center">
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
                              setData({});
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
                          maxW="340px"
                          fontFamily="mono"
                          placeholder="or paste a template ID (d-...)"
                          value={templateId}
                          onChange={(e) => setTemplateId(e.target.value.trim())}
                        />
                        <OutlineBtn onClick={() => setSgTemplates(null)}>
                          <FiRefreshCw /> Refresh
                        </OutlineBtn>
                      </Flex>
                    )}
                    {sgErr && <Hint tone="warn">{sgErr}</Hint>}
                    {templateId && !TEMPLATE_ID_RE.test(templateId) && (
                      <Hint tone="error">
                        Template IDs start with d- followed by letters and
                        numbers.
                      </Hint>
                    )}
                  </Box>
                  {TEMPLATE_ID_RE.test(templateId) && (
                    <VariablesEditor
                      data={data}
                      setData={setData}
                      detected={detectedVars}
                      detectedKnown={!!preview}
                    />
                  )}
                  <Box>
                    <OutlineBtn onClick={() => setShowSgHelp((v) => !v)}>
                      {showSgHelp ? "Hide" : "Show"} how to set up a template
                    </OutlineBtn>
                    {showSgHelp && (
                      <Box
                        mt={2}
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        borderRadius="md"
                        p={3}
                      >
                        <Text
                          color="nexzy.gray.100"
                          fontSize="xs"
                          lineHeight="1.7"
                        >
                          1. SendGrid: Email API, Dynamic Templates, Create a
                          Dynamic Template.
                          <br />
                          2. Add Version, Blank Template, Code Editor. Paste the
                          HTML.
                          <br />
                          3. Settings: Subject = {"{{subject}}"}. Link to{" "}
                          {"{{unsubscribe_url}}"} somewhere. Save.
                          <br />
                          4. Refresh here and pick it.
                        </Text>
                        <OutlineBtn mt={2} onClick={copyDesign}>
                          {copied
                            ? "Copied - paste it into SendGrid's Code Editor"
                            : "Copy the Nexzy design HTML"}
                        </OutlineBtn>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </StepCard>

            {/* 3. Sender + subject */}
            <StepCard n={3} title="Sender and subject" done={subjLen > 0}>
              <Flex gap={4} direction={{ base: "column", md: "row" }}>
                <Box flex="1">
                  <Label>From name</Label>
                  <Input
                    size="sm"
                    {...inputProps}
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                  />
                  <Hint>
                    Sent from {summary.defaults.fromEmail || "(no address set)"}
                  </Hint>
                </Box>
                <Box flex="1">
                  <Label>Replies go to</Label>
                  <Input
                    size="sm"
                    {...inputProps}
                    placeholder="support@nexzyapp.com"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                  {asksForReply && !replyTo.trim() && (
                    <Hint tone="warn">
                      The email asks people to reply. Set an inbox you read.
                    </Hint>
                  )}
                </Box>
              </Flex>
              <Box>
                <Label>Subject</Label>
                <Input
                  size="sm"
                  {...inputProps}
                  placeholder="What shows in bold in the inbox"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Hint tone={subjLen > 60 ? "warn" : "muted"}>
                  {subjLen} characters
                  {subjLen > 60
                    ? " - phones may cut it off after about 60"
                    : ""}
                </Hint>
              </Box>
              <Box>
                <Label>Preview text</Label>
                <Input
                  size="sm"
                  {...inputProps}
                  placeholder="The grey line after the subject in the inbox"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                />
                <Hint>
                  {preLen} characters
                  {mode === "sendgrid"
                    ? " - only shows if the template uses {{preheader}}"
                    : ""}
                </Hint>
              </Box>
            </StepCard>

            {/* 4. Test */}
            <StepCard n={4} title="Send a test" done={testedCurrent}>
              <Flex
                gap={2}
                align="flex-start"
                direction={{ base: "column", md: "row" }}
              >
                <Box flex="1" w="100%">
                  <Input
                    size="sm"
                    {...inputProps}
                    placeholder="Blank = your email. Up to 5, comma separated."
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                </Box>
                <PrimaryBtn
                  onClick={doTest}
                  loading={busy === "test"}
                  loadingText="Sending"
                  disabled={!canTest || busy !== ""}
                >
                  Send test
                </PrimaryBtn>
              </Flex>
              {testMsg && (
                <Hint tone={testMsg.ok ? "ok" : "error"}>{testMsg.text}</Hint>
              )}
              {!canTest && <Hint>Finish steps 2 and 3 to send a test.</Hint>}
              {testSig && !testedCurrent && (
                <Hint tone="warn">
                  You changed the email after the last test.
                </Hint>
              )}
            </StepCard>

            {/* 5. Send */}
            <StepCard n={5} title="Send">
              <VStack align="stretch" gap={1}>
                <Check state={count > 0 && listFresh ? "ok" : "todo"}>
                  Recipients: {AUDIENCE_LABEL[audience]} -{" "}
                  {audience === "custom" && !listFresh ? "..." : count} people
                </Check>
                <Check state={contentReady ? "ok" : "todo"}>
                  Content: {modeLabel}
                  {mode === "sendgrid" && templateName
                    ? ` (${templateName})`
                    : ""}
                </Check>
                {emptyVars.length > 0 && (
                  <Check state="warn">
                    Empty variables: {emptyVars.join(", ")}
                  </Check>
                )}
                <Check state={subjLen > 0 ? "ok" : "todo"}>
                  Subject{subjLen > 0 ? `: ${subject.trim()}` : ""}
                </Check>
                <Check state={testedCurrent ? "ok" : "warn"}>
                  {testedCurrent
                    ? "Test sent for this version"
                    : "Not tested yet (recommended)"}
                </Check>
              </VStack>

              {!confirmOpen ? (
                <Box>
                  <PrimaryBtn
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canSend}
                  >
                    {`Send to ${count} people`}
                  </PrimaryBtn>
                  {blockers.length > 0 && !running && (
                    <Hint tone="warn">{blockers[0]}</Hint>
                  )}
                  {running && <Hint>A send is in progress.</Hint>}
                </Box>
              ) : (
                <Box
                  borderWidth="1px"
                  borderColor="orange.400"
                  borderRadius="md"
                  p={3}
                  bg="rgba(237,137,54,0.08)"
                >
                  <Text color="nexzy.white" fontSize="sm" fontWeight="700">
                    Send &quot;{subject.trim()}&quot; to {count} people?
                  </Text>
                  <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
                    {AUDIENCE_LABEL[audience]} - {modeLabel} - from{" "}
                    {fromName || "Nexzy"}. This can&apos;t be undone.
                  </Text>
                  <HStack mt={3} gap={2}>
                    <Button
                      size="sm"
                      bg="orange.500"
                      color="white"
                      _hover={{ bg: "orange.600" }}
                      onClick={doSend}
                      loading={busy === "send"}
                      loadingText="Starting"
                      disabled={!canSend}
                    >
                      Yes, send to {count}
                    </Button>
                    <OutlineBtn size="sm" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </OutlineBtn>
                  </HStack>
                </Box>
              )}
              {sendMsg && (
                <Hint tone={sendMsg.ok ? "ok" : "error"}>{sendMsg.text}</Hint>
              )}

              {job && (
                <Box
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  borderRadius="md"
                  p={3}
                >
                  <Flex justify="space-between" gap={2} wrap="wrap">
                    <Text color="nexzy.white" fontSize="sm" fontWeight="600">
                      {running ? "Sending" : "Last send"}: {job.subject}
                    </Text>
                    <Text color="nexzy.gray.100" fontSize="xs">
                      {AUDIENCE_LABEL[job.audience] ?? job.audience}
                    </Text>
                  </Flex>
                  <Box
                    mt={2}
                    h="6px"
                    bg="whiteAlpha.200"
                    borderRadius="full"
                    overflow="hidden"
                  >
                    <Box
                      h="100%"
                      w={`${Math.min(100, progress)}%`}
                      bg={job.failed > 0 ? "orange.400" : "green.400"}
                      transition="width 0.4s"
                    />
                  </Box>
                  <Text color="nexzy.gray.100" fontSize="xs" mt={2}>
                    {job.sent} sent, {job.failed} failed, of {job.total}
                    {job.finishedAt
                      ? ` - finished ${new Date(job.finishedAt).toLocaleString()}`
                      : ""}
                  </Text>
                  {job.failures.length > 0 && (
                    <Hint tone="error">Failed: {job.failures.join(", ")}</Hint>
                  )}
                </Box>
              )}
            </StepCard>

            {/* Automatic welcome email */}
            <Box
              bg="whiteAlpha.50"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              p={{ base: 3, md: 4 }}
            >
              <Text color="nexzy.white" fontWeight="700" fontSize="sm">
                Welcome email (automatic)
              </Text>
              <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
                Every new account gets this once: after email sign-up is
                verified, or on the first Apple or Google sign-in. Send it to
                yourself to see what new users get (uses the address in step 4,
                or yours if blank).
              </Text>
              <Box mt={3}>
                <OutlineBtn
                  size="sm"
                  onClick={doWelcomeTest}
                  loading={busy === "welcome"}
                  loadingText="Sending"
                  disabled={busy !== ""}
                >
                  Send me the welcome email
                </OutlineBtn>
              </Box>
              {welcomeMsg && (
                <Hint tone={welcomeMsg.ok ? "ok" : "error"}>
                  {welcomeMsg.text}
                </Hint>
              )}
            </Box>
          </VStack>

          {/* ---------------- RIGHT: live preview ---------------- */}
          <Box
            position={{ base: "static", xl: "sticky" }}
            top="16px"
            minW={0}
            bg="whiteAlpha.50"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            p={{ base: 3, md: 4 }}
          >
            <Flex
              justify="space-between"
              align="center"
              mb={3}
              gap={2}
              wrap="wrap"
            >
              <HStack gap={2}>
                <Text color="nexzy.white" fontWeight="700" fontSize="sm">
                  Preview
                </Text>
                {previewLoading && <Spinner size="xs" color="nexzy.blue" />}
              </HStack>
              <HStack gap={2}>
                <Segmented<"desktop" | "mobile">
                  value={device}
                  onChange={setDevice}
                  options={[
                    { key: "desktop", label: <FiMonitor /> },
                    { key: "mobile", label: <FiSmartphone /> },
                  ]}
                />
                <OutlineBtn
                  onClick={refreshPreview}
                  disabled={!contentReady || previewLoading}
                  aria-label="Refresh preview"
                >
                  <FiRefreshCw />
                </OutlineBtn>
              </HStack>
            </Flex>

            {/* Inbox row */}
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="md"
              px={3}
              py={2}
              mb={3}
            >
              <Text color="nexzy.white" fontSize="xs" fontWeight="700">
                {fromName || "Nexzy"}
              </Text>
              <Text color="nexzy.white" fontSize="sm" fontWeight="600" truncate>
                {(preview?.subject || subject).trim() || "(no subject yet)"}
              </Text>
              <Text color="whiteAlpha.600" fontSize="xs" truncate>
                {preheader.trim() || "(no preview text)"}
              </Text>
            </Box>

            {previewErr && <Hint tone="error">{previewErr}</Hint>}
            {preview?.warnings.map((w, i) => (
              <Hint key={i} tone="warn">
                {w}
              </Hint>
            ))}

            {preview?.html ? (
              <Flex justify="center" mt={2}>
                <iframe
                  title="Email preview"
                  srcDoc={preview.html}
                  sandbox=""
                  style={{
                    width: device === "mobile" ? 390 : "100%",
                    maxWidth: "100%",
                    height: 820,
                    background: "#fff",
                    border: 0,
                    borderRadius: 8,
                    opacity: previewLoading ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                />
              </Flex>
            ) : (
              <Flex
                h="320px"
                align="center"
                justify="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="whiteAlpha.300"
                borderRadius="md"
                px={6}
              >
                <Text color="whiteAlpha.600" fontSize="sm" textAlign="center">
                  {previewLoading
                    ? "Loading the preview..."
                    : mode === "sendgrid"
                      ? "Pick a SendGrid template to see it here."
                      : "Start writing and the preview shows up here."}
                </Text>
              </Flex>
            )}
          </Box>
        </Box>
      )}
    </VStack>
  );
}
