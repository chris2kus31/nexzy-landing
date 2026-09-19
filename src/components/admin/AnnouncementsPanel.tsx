"use client";

// Admin control for announcement banners (feed top, app + web). Create / edit /
// activate / delete. Type presets pre-fill colour + icon + kicker (all
// overridable). Live preview mirrors the app/site banner. Everything is data —
// new banners never need an app store submission.
import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Input,
} from "@chakra-ui/react";
import {
  FaBolt,
  FaBullhorn,
  FaCheckCircle,
  FaWrench,
  FaExclamationTriangle,
  FaGift,
  FaTrophy,
  FaInfoCircle,
  FaTrash,
  FaPen,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncement,
  type AnnouncementInput,
} from "@/lib/admin/client";

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};
const nativeControl: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#EAF0FA",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const PRESETS: Record<
  string,
  { accentColor: string; iconName: string; kicker: string }
> = {
  live: { accentColor: "#FFD700", iconName: "bolt", kicker: "Live event" },
  announcement: {
    accentColor: "#4da3ff",
    iconName: "bullhorn",
    kicker: "Announcement",
  },
  update: {
    accentColor: "#4ADE80",
    iconName: "check-circle",
    kicker: "Update",
  },
  maintenance: {
    accentColor: "#FBB454",
    iconName: "wrench",
    kicker: "Maintenance",
  },
  alert: {
    accentColor: "#FF4D6D",
    iconName: "exclamation-triangle",
    kicker: "Alert",
  },
  promo: { accentColor: "#B794F6", iconName: "gift", kicker: "Promo" },
  contest: { accentColor: "#F472B6", iconName: "trophy", kicker: "Contest" },
};
const TYPES = Object.keys(PRESETS);
const ICONS: Record<string, IconType> = {
  bolt: FaBolt,
  bullhorn: FaBullhorn,
  "check-circle": FaCheckCircle,
  wrench: FaWrench,
  "exclamation-triangle": FaExclamationTriangle,
  gift: FaGift,
  trophy: FaTrophy,
  "info-circle": FaInfoCircle,
};

type Form = {
  id: string | null;
  type: string;
  accentColor: string;
  iconName: string;
  kicker: string;
  title: string;
  subtitle: string;
  audience: "everyone" | "authenticated";
  priority: number;
  ctaAction: "none" | "link" | "remind";
  ctaLabel: string;
  ctaTarget: string;
  eventAt: string;
  reminderLeadMinutes: number;
  startAt: string;
  endAt: string;
  autoDismissAfterHours: string;
  active: boolean;
};

const EMPTY: Form = {
  id: null,
  type: "announcement",
  accentColor: "",
  iconName: "",
  kicker: "",
  title: "",
  subtitle: "",
  audience: "everyone",
  priority: 0,
  ctaAction: "none",
  ctaLabel: "",
  ctaTarget: "",
  eventAt: "",
  reminderLeadMinutes: 15,
  startAt: "",
  endAt: "",
  autoDismissAfterHours: "",
  active: true,
};

const tint = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return `rgba(255,215,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ISO <-> <input type="datetime-local"> (local time) helpers.
const isoToLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const localToIso = (local: string): string | null =>
  local ? new Date(local).toISOString() : null;

export default function AnnouncementsPanel() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => {
    setLoading(true);
    listAnnouncements()
      .then(setItems)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickType = (t: string) => {
    const p = PRESETS[t];
    setForm((f) => ({
      ...f,
      type: t,
      // Only fill blanks so an edit doesn't clobber overrides.
      accentColor: f.accentColor || (p?.accentColor ?? ""),
      iconName: f.iconName || (p?.iconName ?? ""),
      kicker: f.kicker || (p?.kicker ?? ""),
    }));
  };

  const startNew = () => {
    setForm(EMPTY);
    setError("");
  };

  const startEdit = (a: AdminAnnouncement) => {
    setError("");
    setForm({
      id: a.id,
      type: a.type,
      accentColor: a.accentColor ?? "",
      iconName: a.iconName ?? "",
      kicker: a.kicker ?? "",
      title: a.title,
      subtitle: a.subtitle ?? "",
      audience: a.audience === "authenticated" ? "authenticated" : "everyone",
      priority: a.priority,
      ctaAction: (a.ctaAction as Form["ctaAction"]) || "none",
      ctaLabel: a.ctaLabel ?? "",
      ctaTarget: a.ctaTarget ?? "",
      eventAt: isoToLocal(a.eventAt),
      reminderLeadMinutes: a.reminderLeadMinutes ?? 15,
      startAt: isoToLocal(a.startAt),
      endAt: isoToLocal(a.endAt),
      autoDismissAfterHours:
        a.autoDismissAfterHours == null ? "" : String(a.autoDismissAfterHours),
      active: a.active,
    });
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload: AnnouncementInput = {
      type: form.type,
      accentColor: form.accentColor || null,
      iconName: form.iconName || null,
      kicker: form.kicker || null,
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      audience: form.audience,
      priority: Number(form.priority) || 0,
      ctaAction: form.ctaAction,
      ctaLabel: form.ctaAction === "none" ? null : form.ctaLabel || null,
      ctaTarget: form.ctaAction === "link" ? form.ctaTarget || null : null,
      eventAt: localToIso(form.eventAt),
      reminderLeadMinutes: Number(form.reminderLeadMinutes) || 15,
      startAt: localToIso(form.startAt),
      endAt: localToIso(form.endAt),
      autoDismissAfterHours: form.autoDismissAfterHours
        ? Number(form.autoDismissAfterHours)
        : null,
      active: form.active,
    };
    try {
      if (form.id) await updateAnnouncement(form.id, payload);
      else await createAnnouncement(payload);
      startNew();
      refresh();
    } catch (e) {
      setError((e as Error)?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: AdminAnnouncement) => {
    try {
      await updateAnnouncement(a.id, { active: !a.active });
      refresh();
    } catch (e) {
      setError((e as Error)?.message || "Update failed");
    }
  };

  const remove = async (a: AdminAnnouncement) => {
    try {
      await deleteAnnouncement(a.id);
      if (form.id === a.id) startNew();
      refresh();
    } catch (e) {
      setError((e as Error)?.message || "Delete failed");
    }
  };

  // Resolved preview values (preset fallback).
  const preset = PRESETS[form.type];
  const pAccent = form.accentColor || preset?.accentColor || "#4da3ff";
  const pIconName = form.iconName || preset?.iconName || "info-circle";
  const pKicker = form.kicker || preset?.kicker || "";
  const PreviewIcon = ICONS[pIconName] ?? FaInfoCircle;

  const label = (t: string) => (
    <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
      {t}
    </Text>
  );

  return (
    <Box>
      <HStack justify="space-between" mb={4} wrap="wrap" gap={2}>
        <Heading size="md" color="nexzy.white">
          Announcement banners
        </Heading>
        <Button
          size="sm"
          onClick={startNew}
          variant="outline"
          color="nexzy.gray.100"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.100" }}
        >
          New banner
        </Button>
      </HStack>

      {error ? (
        <Box
          bg="red.500/10"
          border="1px solid"
          borderColor="red.400/50"
          borderRadius="md"
          p={2}
          mb={3}
        >
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        </Box>
      ) : null}

      <HStack align="flex-start" gap={6} wrap="wrap">
        {/* Editor */}
        <VStack align="stretch" gap={3} flex="1 1 420px" minW="320px">
          {/* Live preview */}
          <Box>
            {label("Preview")}
            <Box
              bg={tint(pAccent, 0.1)}
              border="1px solid"
              borderColor={tint(pAccent, 0.35)}
              borderRadius="14px"
              position="relative"
              overflow="hidden"
              px={3}
              py={2.5}
            >
              <Box
                position="absolute"
                left={0}
                top={0}
                bottom={0}
                w="4px"
                bg={pAccent}
              />
              <HStack gap={3}>
                <Flexish accent={pAccent}>
                  <PreviewIcon size={15} />
                </Flexish>
                <Box flex="1" minW={0}>
                  {pKicker ? (
                    <Text
                      fontSize="10px"
                      fontWeight="700"
                      letterSpacing="1px"
                      textTransform="uppercase"
                      color={pAccent}
                    >
                      {pKicker}
                    </Text>
                  ) : null}
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="white"
                    lineClamp={2}
                  >
                    {form.title || "Banner title"}
                  </Text>
                  {form.subtitle ? (
                    <Text fontSize="xs" color="whiteAlpha.700" lineClamp={1}>
                      {form.subtitle}
                    </Text>
                  ) : null}
                </Box>
                {form.ctaAction !== "none" && form.ctaLabel ? (
                  <Button
                    size="xs"
                    bg={pAccent}
                    color="#12152a"
                    fontWeight="600"
                    _hover={{ opacity: 0.9 }}
                  >
                    {form.ctaLabel}
                  </Button>
                ) : null}
              </HStack>
            </Box>
          </Box>

          <HStack gap={3} align="flex-start">
            <Box flex="1">
              {label("Type (preset)")}
              <select
                value={form.type}
                onChange={(e) => pickType(e.target.value)}
                style={nativeControl}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} style={{ color: "#000" }}>
                    {t}
                  </option>
                ))}
              </select>
            </Box>
            <Box flex="1">
              {label("Audience")}
              <select
                value={form.audience}
                onChange={(e) =>
                  set("audience", e.target.value as Form["audience"])
                }
                style={nativeControl}
              >
                <option value="everyone" style={{ color: "#000" }}>
                  Everyone
                </option>
                <option value="authenticated" style={{ color: "#000" }}>
                  Logged-in only
                </option>
              </select>
            </Box>
          </HStack>

          <Box>
            {label("Title")}
            <Input
              {...inputProps}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Nexzy Live at 3:00 PM CST"
              maxLength={140}
            />
          </Box>
          <Box>
            {label("Subtitle (optional)")}
            <Input
              {...inputProps}
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Tune in for the Season drop reveal"
              maxLength={200}
            />
          </Box>

          <HStack gap={3} align="flex-start">
            <Box flex="1">
              {label("Accent color")}
              <HStack gap={2}>
                <input
                  type="color"
                  value={pAccent}
                  onChange={(e) => set("accentColor", e.target.value)}
                  style={{
                    width: 40,
                    height: 34,
                    background: "transparent",
                    border: "none",
                  }}
                />
                <Input
                  {...inputProps}
                  value={form.accentColor}
                  onChange={(e) => set("accentColor", e.target.value)}
                  placeholder={preset?.accentColor ?? "#4da3ff"}
                />
              </HStack>
            </Box>
            <Box flex="1">
              {label("Icon (FontAwesome name)")}
              <select
                value={form.iconName || preset?.iconName || "info-circle"}
                onChange={(e) => set("iconName", e.target.value)}
                style={nativeControl}
              >
                {Object.keys(ICONS).map((n) => (
                  <option key={n} value={n} style={{ color: "#000" }}>
                    {n}
                  </option>
                ))}
              </select>
            </Box>
          </HStack>

          <HStack gap={3} align="flex-start">
            <Box flex="1">
              {label("Kicker (override)")}
              <Input
                {...inputProps}
                value={form.kicker}
                onChange={(e) => set("kicker", e.target.value)}
                placeholder={preset?.kicker ?? ""}
                maxLength={40}
              />
            </Box>
            <Box flex="1">
              {label("Priority")}
              <Input
                {...inputProps}
                type="number"
                value={String(form.priority)}
                onChange={(e) => set("priority", Number(e.target.value) || 0)}
              />
            </Box>
          </HStack>

          <Box>
            {label("Call to action")}
            <select
              value={form.ctaAction}
              onChange={(e) =>
                set("ctaAction", e.target.value as Form["ctaAction"])
              }
              style={nativeControl}
            >
              <option value="none" style={{ color: "#000" }}>
                None
              </option>
              <option value="link" style={{ color: "#000" }}>
                Link (deep-link or URL)
              </option>
              <option value="remind" style={{ color: "#000" }}>
                Remind me (Live, app only)
              </option>
            </select>
          </Box>
          {form.ctaAction !== "none" ? (
            <HStack gap={3} align="flex-start">
              <Box flex="1">
                {label("Button label")}
                <Input
                  {...inputProps}
                  value={form.ctaLabel}
                  onChange={(e) => set("ctaLabel", e.target.value)}
                  placeholder={
                    form.ctaAction === "remind" ? "Remind me" : "See what's new"
                  }
                  maxLength={40}
                />
              </Box>
              {form.ctaAction === "link" ? (
                <Box flex="1">
                  {label("Target (/route or https URL)")}
                  <Input
                    {...inputProps}
                    value={form.ctaTarget}
                    onChange={(e) => set("ctaTarget", e.target.value)}
                    placeholder="/games or https://..."
                  />
                </Box>
              ) : null}
            </HStack>
          ) : null}

          {form.type === "live" || form.ctaAction === "remind" ? (
            <HStack gap={3} align="flex-start">
              <Box flex="1">
                {label("Event time")}
                <input
                  type="datetime-local"
                  value={form.eventAt}
                  onChange={(e) => set("eventAt", e.target.value)}
                  style={nativeControl}
                />
              </Box>
              <Box flex="1">
                {label("Remind (min before)")}
                <Input
                  {...inputProps}
                  type="number"
                  value={String(form.reminderLeadMinutes)}
                  onChange={(e) =>
                    set("reminderLeadMinutes", Number(e.target.value) || 15)
                  }
                />
              </Box>
            </HStack>
          ) : null}

          <HStack gap={3} align="flex-start">
            <Box flex="1">
              {label("Show from (optional)")}
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                style={nativeControl}
              />
            </Box>
            <Box flex="1">
              {label("Show until (optional)")}
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                style={nativeControl}
              />
            </Box>
          </HStack>

          <HStack gap={3} align="center">
            <Box flex="1">
              {label("Auto-dismiss after (hours, optional)")}
              <Input
                {...inputProps}
                type="number"
                value={form.autoDismissAfterHours}
                onChange={(e) => set("autoDismissAfterHours", e.target.value)}
                placeholder="e.g. 6"
              />
            </Box>
            <Box flex="1">
              {label("Status")}
              <Button
                size="sm"
                w="100%"
                onClick={() => set("active", !form.active)}
                bg={form.active ? "green.500/20" : "whiteAlpha.100"}
                color={form.active ? "green.200" : "nexzy.gray.100"}
                border="1px solid"
                borderColor={form.active ? "green.400/50" : "whiteAlpha.300"}
                _hover={{ opacity: 0.9 }}
              >
                {form.active ? "Active" : "Paused"}
              </Button>
            </Box>
          </HStack>

          <HStack gap={2} pt={1}>
            <Button
              size="sm"
              onClick={save}
              loading={saving}
              bg="nexzy.blue"
              color="white"
              _hover={{ opacity: 0.9 }}
            >
              {form.id ? "Save changes" : "Create banner"}
            </Button>
            {form.id ? (
              <Button
                size="sm"
                variant="outline"
                color="nexzy.gray.100"
                borderColor="whiteAlpha.300"
                _hover={{ bg: "whiteAlpha.100" }}
                onClick={startNew}
              >
                Cancel
              </Button>
            ) : null}
          </HStack>
        </VStack>

        {/* List */}
        <VStack align="stretch" gap={2} flex="1 1 320px" minW="300px">
          {label("Existing banners")}
          {loading ? (
            <Text color="nexzy.gray.100" fontSize="sm">
              Loading…
            </Text>
          ) : items.length === 0 ? (
            <Text color="nexzy.gray.100" fontSize="sm">
              No banners yet.
            </Text>
          ) : (
            items.map((a) => {
              const acc =
                a.accentColor || PRESETS[a.type]?.accentColor || "#4da3ff";
              return (
                <Box
                  key={a.id}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  p={3}
                >
                  <HStack gap={2} mb={1} wrap="wrap">
                    <Box w="10px" h="10px" borderRadius="3px" bg={acc} />
                    <Text
                      fontSize="xs"
                      color="whiteAlpha.700"
                      textTransform="uppercase"
                      letterSpacing="1px"
                    >
                      {a.type}
                    </Text>
                    <Box flex="1" />
                    <Text
                      fontSize="10px"
                      color={a.active ? "green.300" : "whiteAlpha.500"}
                      fontWeight="700"
                    >
                      {a.active ? "ACTIVE" : "PAUSED"}
                    </Text>
                  </HStack>
                  <Text
                    fontSize="sm"
                    color="nexzy.white"
                    fontWeight="600"
                    lineClamp={1}
                  >
                    {a.title}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.600" mb={2}>
                    {a.audience === "authenticated" ? "Logged-in" : "Everyone"}
                    {a.endAt
                      ? ` · until ${new Date(a.endAt).toLocaleString()}`
                      : ""}
                  </Text>
                  <HStack gap={2}>
                    <Button
                      size="xs"
                      variant="outline"
                      color="nexzy.gray.100"
                      borderColor="whiteAlpha.300"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => startEdit(a)}
                    >
                      <FaPen /> Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      color="nexzy.gray.100"
                      borderColor="whiteAlpha.300"
                      _hover={{ bg: "whiteAlpha.100" }}
                      onClick={() => toggleActive(a)}
                    >
                      {a.active ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      color="red.300"
                      borderColor="red.400/50"
                      _hover={{ bg: "red.500/15" }}
                      onClick={() => remove(a)}
                    >
                      <FaTrash />
                    </Button>
                  </HStack>
                </Box>
              );
            })
          )}
        </VStack>
      </HStack>
    </Box>
  );
}

// Small coloured icon chip used in the preview.
function Flexish({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      w="30px"
      h="30px"
      borderRadius="8px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flex="0 0 auto"
      bg={tint(accent, 0.16)}
      color={accent}
    >
      {children}
    </Box>
  );
}
