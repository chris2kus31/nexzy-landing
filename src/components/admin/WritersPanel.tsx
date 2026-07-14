"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Stack,
  SimpleGrid,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  listPersonas,
  createPersona,
  updatePersona,
  type WriterPersona,
  type PersonaInput,
} from "@/lib/admin/client";
import { BEATS } from "@/lib/blog/beats";

const CHANNELS = ["x", "facebook", "discord", "reddit"];

const inputProps = {
  color: "nexzy.white",
  bg: "whiteAlpha.50",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "nexzy.gray.100" },
} as const;

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      bg={active ? "nexzy.blue" : "transparent"}
      color={active ? "white" : "nexzy.gray.100"}
      borderWidth="1px"
      borderColor={active ? "nexzy.blue" : "whiteAlpha.300"}
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
    >
      {label}
    </Button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Text color="nexzy.gray.100" fontSize="xs" mb={1.5}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text color="nexzy.gray.100" fontSize="10px" mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}

function PersonaForm({
  persona,
  onSaved,
  onCancel,
}: {
  persona?: WriterPersona;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!persona;
  const [f, setF] = useState<PersonaInput>({
    name: persona?.name ?? "",
    slug: persona?.slug ?? "",
    active: persona?.active ?? true,
    title: persona?.title ?? "",
    bio: persona?.bio ?? "",
    avatarUrl: persona?.avatarUrl ?? "",
    modelWriter: persona?.modelWriter ?? "",
    toneBible: persona?.toneBible ?? "",
    exemplars: persona?.exemplars ?? "",
    styleNotes: persona?.styleNotes ?? "",
    guideBible: persona?.guideBible ?? "",
    beats: persona?.beats ?? [],
    channels: persona?.channels ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (patch: Partial<PersonaInput>) =>
    setF((p) => ({ ...p, ...patch }));

  const toggleIn = (k: "beats" | "channels", v: string) =>
    setF((p) => {
      const cur = (p[k] as string[]) ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...p, [k]: next };
    });

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const canSave =
    (f.name ?? "").trim().length >= 1 &&
    (f.toneBible ?? "").trim().length >= 10 &&
    !saving;

  const submit = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload: PersonaInput = {
        ...f,
        slug: (f.slug ?? "").trim() || slugify(f.name ?? ""),
      };
      if (isEdit) await updatePersona(persona!.id, payload);
      else await createPersona(payload);
      onSaved();
    } catch (e) {
      setMsg((e as Error)?.message || "Could not save.");
      setSaving(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
    >
      <Stack gap={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Field
            label="Byline name"
            hint={
              isEdit
                ? "The byline on published posts — renames new posts only."
                : "Shown as the author on articles + social."
            }
          >
            <Input
              value={f.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Mara"
              {...inputProps}
            />
          </Field>
          <Field label="URL slug" hint="/author/<slug>">
            <Input
              value={f.slug ?? ""}
              onChange={(e) => set({ slug: e.target.value })}
              placeholder="auto from name"
              {...inputProps}
            />
          </Field>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Field label="Title (optional)">
            <Input
              value={f.title ?? ""}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Hardware Writer"
              {...inputProps}
            />
          </Field>
          <Field
            label="Writer model (optional)"
            hint="Blank = newsroom default (e.g. gemini-3.5-flash)."
          >
            <Input
              value={f.modelWriter ?? ""}
              onChange={(e) => set({ modelWriter: e.target.value })}
              placeholder="default"
              {...inputProps}
            />
          </Field>
        </SimpleGrid>

        <Field label="Avatar URL (optional)">
          <Input
            value={f.avatarUrl ?? ""}
            onChange={(e) => set({ avatarUrl: e.target.value })}
            placeholder="https://…"
            {...inputProps}
          />
        </Field>

        <Field label="Bio (optional — author page + Person schema)">
          <Textarea
            value={f.bio ?? ""}
            onChange={(e) => set({ bio: e.target.value })}
            rows={2}
            {...inputProps}
          />
        </Field>

        <Field
          label="Owns beats"
          hint="Leads in these beats route to this writer."
        >
          <HStack gap={2} wrap="wrap">
            {BEATS.map((b) => (
              <Chip
                key={b.key}
                label={b.label}
                active={(f.beats ?? []).includes(b.key)}
                onClick={() => toggleIn("beats", b.key)}
              />
            ))}
          </HStack>
        </Field>

        <Field
          label="Voices channels"
          hint="Social channels this writer speaks on."
        >
          <HStack gap={2} wrap="wrap">
            {CHANNELS.map((c) => (
              <Chip
                key={c}
                label={c}
                active={(f.channels ?? []).includes(c)}
                onClick={() => toggleIn("channels", c)}
              />
            ))}
          </HStack>
        </Field>

        <Field
          label="Tone bible"
          hint="The voice prompt the writer follows (required)."
        >
          <Textarea
            value={f.toneBible ?? ""}
            onChange={(e) => set({ toneBible: e.target.value })}
            rows={10}
            fontFamily="mono"
            fontSize="xs"
            {...inputProps}
          />
        </Field>

        <Field
          label="Voice exemplars (optional)"
          hint="Worked examples the model imitates for tone + shape."
        >
          <Textarea
            value={f.exemplars ?? ""}
            onChange={(e) => set({ exemplars: e.target.value })}
            rows={6}
            fontFamily="mono"
            fontSize="xs"
            {...inputProps}
          />
        </Field>

        <Field label="Style notes (optional)">
          <Textarea
            value={f.styleNotes ?? ""}
            onChange={(e) => set({ styleNotes: e.target.value })}
            rows={2}
            {...inputProps}
          />
        </Field>

        <Field
          label="Guide voice (optional)"
          hint="How-to voice; blank = the shared guide tone."
        >
          <Textarea
            value={f.guideBible ?? ""}
            onChange={(e) => set({ guideBible: e.target.value })}
            rows={4}
            fontFamily="mono"
            fontSize="xs"
            {...inputProps}
          />
        </Field>

        <Flex justify="space-between" align="center">
          <Button
            size="sm"
            variant="ghost"
            color="nexzy.gray.100"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={submit}
            disabled={!canSave}
            loading={saving}
            loadingText="Saving…"
          >
            {isEdit ? "Save changes" : "Create writer"}
          </Button>
        </Flex>
        {msg && (
          <Text fontSize="sm" color="red.300">
            {msg}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

function PersonaCard({
  persona,
  onChanged,
}: {
  persona: WriterPersona;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const togglePause = async () => {
    setBusy(true);
    try {
      await updatePersona(persona.id, { active: !persona.active });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={persona.active ? "whiteAlpha.200" : "orange.400/40"}
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box>
          <HStack gap={2}>
            <Heading size="sm" color="nexzy.white">
              {persona.name}
            </Heading>
            <Badge
              colorPalette={persona.active ? "green" : "orange"}
              variant="subtle"
            >
              {persona.active ? "Active" : "Paused"}
            </Badge>
          </HStack>
          <Text color="nexzy.gray.100" fontSize="xs" mt={1}>
            /author/{persona.slug}
            {persona.beats?.length ? ` · ${persona.beats.join(", ")}` : ""}
            {persona.modelWriter ? ` · ${persona.modelWriter}` : ""}
          </Text>
        </Box>
        <HStack gap={2}>
          <Button
            size="xs"
            variant="outline"
            color={persona.active ? "orange.300" : "green.300"}
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={togglePause}
            loading={busy}
          >
            {persona.active ? "Pause" : "Activate"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="nexzy.white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </Button>
        </HStack>
      </Flex>
      {editing && (
        <Box mt={4}>
          <PersonaForm
            persona={persona}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * Writers tab. Manage the newsroom's author personas: each has its own tone
 * bible, the beats it covers, and the channels it voices. Pausing a writer
 * stops new assignments (their published work stays live). Owner-only.
 */
export default function WritersPanel() {
  const [rows, setRows] = useState<WriterPersona[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listPersonas());
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load writers.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <VStack align="stretch" gap={5}>
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box maxW="640px">
          <Heading size="md" color="nexzy.white" mb={1}>
            Writers
          </Heading>
          <Text color="nexzy.gray.100" fontSize="sm">
            Each writer has their own tone bible, the beats they cover, and the
            channels they voice. Pause a writer to stop new assignments — their
            published work stays live.
          </Text>
        </Box>
        <Button
          size="sm"
          colorPalette="blue"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Close" : "New writer"}
        </Button>
      </Flex>

      {error && (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      )}

      {creating && (
        <PersonaForm
          onSaved={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {rows === null ? (
        <Flex justify="center" py={10}>
          <Spinner color="nexzy.blue" />
        </Flex>
      ) : rows.length === 0 ? (
        <Text color="nexzy.gray.100" fontSize="sm">
          No writers yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {rows.map((p) => (
            <PersonaCard key={p.id} persona={p} onChanged={load} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
