// Admin client for the mega hub engine (Phase 4): the per-game guide
// template (draft -> publish, history), entries, pins, uploads, import and
// export. Same-origin proxy via adminRequest.
"use client";

import type {
  HubBlock,
  HubImage,
  HubTemplateConfig,
} from "@/lib/hub-engine/types";

const enc = encodeURIComponent;

/** Error that keeps the API's list of validation problems for display. */
export class EngineError extends Error {
  constructor(
    message: string,
    readonly lines: string[],
  ) {
    super(message);
  }
}

/** Same-origin admin proxy, like adminRequest, but validation errors keep
 *  their per-field list so the editor can show every problem at once. */
async function adminRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/newsroom/admin/${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers:
      init.body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) {
    if (
      typeof window !== "undefined" &&
      !location.pathname.startsWith("/admin/login")
    )
      location.href = "/admin/login";
    throw new EngineError("Not signed in", ["Not signed in"]);
  }
  if (res.status === 413)
    throw new EngineError("Too large", [
      "That file is too large to upload (keep it under 4 MB).",
    ]);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: unknown;
      errors?: unknown;
      error?: unknown;
    };
    const msg =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `Request failed (${res.status})`;
    const lines = Array.isArray(body.errors)
      ? body.errors.map(String)
      : Array.isArray(body.message)
        ? body.message.map(String)
        : [msg];
    throw new EngineError(msg, lines);
  }
  const text = await res.text();
  return (text.trim() ? JSON.parse(text) : null) as T;
}
const base = (gameId: string) => `hub-engine/${enc(gameId)}`;

export type EntryStatus = "draft" | "unconfirmed" | "confirmed" | "hidden";
export const ENTRY_STATUSES: {
  key: EntryStatus;
  label: string;
  hint: string;
}[] = [
  { key: "draft", label: "Draft", hint: "Only admins see it" },
  {
    key: "unconfirmed",
    label: "Unconfirmed",
    hint: "Public, with the unconfirmed label",
  },
  { key: "confirmed", label: "Confirmed", hint: "Public" },
  { key: "hidden", label: "Hidden", hint: "Taken down, kept for later" },
];

export interface EngineTemplateRow {
  gameId: string;
  name: string;
  slug: string;
  enabled: boolean;
  version: number;
  hasDraft: boolean;
  entries: number;
  publishedAt: string | null;
}

export interface EngineTemplate {
  game: { id: string; name: string; slug: string };
  enabled: boolean;
  version: number;
  contentVersion: number;
  published: HubTemplateConfig | null;
  draft: HubTemplateConfig;
  hasDraft: boolean;
  /** Fingerprint of the template this page loaded; Save draft sends it back
   *  so the API can refuse to save over a newer version (stale tab). */
  draftHash: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  imagePrefix: string;
  counts: {
    byType: { type: string; status: string; n: number }[];
    pins: number;
  };
  history: {
    version: number;
    summary: string | null;
    publishedBy: string | null;
    at: string;
  }[];
}

export interface EngineEntryRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  status: EntryStatus;
  sortOrder: number;
  pins: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface EngineEntry {
  id: string;
  typeKey: string;
  slug: string;
  title: string;
  summary: string | null;
  fields: Record<string, unknown>;
  media: HubImage[];
  status: EntryStatus;
  spoilerStage: string | null;
  eras: string[];
  sortOrder: number;
  updatedAt: string;
  updatedBy: string | null;
  pins: { id: string; mapKey: string; x: number; y: number }[];
  linkRefs: { id: string; slug: string; title: string; type: string }[];
}

export interface EntryInput {
  typeKey: string;
  title: string;
  slug?: string | null;
  summary?: string | null;
  status?: EntryStatus;
  spoilerStage?: string | null;
  eras?: string[];
  sortOrder?: number;
  fields?: Record<string, unknown>;
  media?: HubImage[];
  /** Quick add: saved with the entry, replacing its pins. */
  pins?: { mapKey: string; x: number; y: number }[];
}

export interface AdminMapPin {
  id: string;
  entryId: string;
  type: string;
  title: string;
  status: EntryStatus;
  x: number;
  y: number;
}

export interface ImportReport {
  dryRun: boolean;
  created: number;
  updated: number;
  pinsReplaced: number;
  errors: { row: number; slug: string | null; errors: string[] }[];
}

export const listEngineTemplates = () =>
  adminRequest<EngineTemplateRow[]>("hub-engine");
export const getEngineTemplate = (gameId: string) =>
  adminRequest<EngineTemplate>(base(gameId));
export const saveEngineDraft = (
  gameId: string,
  config: HubTemplateConfig,
  baseHash: string | null,
) =>
  adminRequest<EngineTemplate>(`${base(gameId)}/draft`, {
    method: "PUT",
    body: baseHash ? { config, baseHash } : { config },
  });
export const discardEngineDraft = (gameId: string) =>
  adminRequest<EngineTemplate>(`${base(gameId)}/draft`, { method: "DELETE" });
export const publishEngine = (gameId: string) =>
  adminRequest<EngineTemplate>(`${base(gameId)}/publish`, { method: "POST" });
export const restoreEngineVersion = (gameId: string, version: number) =>
  adminRequest<EngineTemplate>(`${base(gameId)}/restore/${version}`, {
    method: "POST",
  });
export const setEngineEnabled = (gameId: string, enabled: boolean) =>
  adminRequest<EngineTemplate>(`${base(gameId)}/enabled`, {
    method: "PUT",
    body: { enabled },
  });

export function listEngineEntries(
  gameId: string,
  q: { type?: string; status?: string; search?: string; cursor?: string } = {},
) {
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v && sp.set(k, v));
  const qs = sp.toString();
  return adminRequest<{ items: EngineEntryRow[]; nextCursor: string | null }>(
    `${base(gameId)}/entries${qs ? `?${qs}` : ""}`,
  );
}
export const getEngineEntry = (gameId: string, id: string) =>
  adminRequest<EngineEntry>(`${base(gameId)}/entries/${enc(id)}`);
export const createEngineEntry = (gameId: string, input: EntryInput) =>
  adminRequest<EngineEntry>(`${base(gameId)}/entries`, {
    method: "POST",
    body: input,
  });
export const updateEngineEntry = (
  gameId: string,
  id: string,
  input: EntryInput,
) =>
  adminRequest<EngineEntry>(`${base(gameId)}/entries/${enc(id)}`, {
    method: "PUT",
    body: input,
  });
export const deleteEngineEntry = (gameId: string, id: string) =>
  adminRequest<{ ok: true }>(`${base(gameId)}/entries/${enc(id)}`, {
    method: "DELETE",
  });
export const setEngineEntryPins = (
  gameId: string,
  id: string,
  pins: { mapKey: string; x: number; y: number }[],
) =>
  adminRequest<{ id: string; mapKey: string; x: number; y: number }[]>(
    `${base(gameId)}/entries/${enc(id)}/pins`,
    { method: "PUT", body: { pins } },
  );
export const getEngineMapPins = (gameId: string, mapKey: string) =>
  adminRequest<AdminMapPin[]>(`${base(gameId)}/maps/${enc(mapKey)}/pins`);
export const uploadEngineImage = (
  gameId: string,
  dataUrl: string,
  purpose: "photo" | "icon" | "map",
  targetWidth?: number,
) =>
  adminRequest<{ url: string; width: number; height: number }>(
    `${base(gameId)}/upload`,
    {
      method: "POST",
      body: { dataUrl, purpose, ...(targetWidth ? { targetWidth } : {}) },
    },
  );
export const importEngineEntries = (
  gameId: string,
  entries: unknown[],
  dryRun: boolean,
) =>
  adminRequest<ImportReport>(`${base(gameId)}/import`, {
    method: "POST",
    body: { entries, dryRun },
  });
export const exportEngineEntries = (gameId: string) =>
  adminRequest<{ entries: unknown[]; truncated?: boolean }>(
    `${base(gameId)}/export`,
  );

// ── guide pages ──

export type PageStatus = "draft" | "published" | "hidden";

export interface EnginePageRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: PageStatus;
  story?: boolean;
  entryId?: string | null;
  parentId: string | null;
  sortOrder: number;
  spoilerStage: string | null;
  eras: string[];
  updatedAt: string;
  updatedBy: string | null;
}

export interface EnginePage extends EnginePageRow {
  /** The entry this page is about (a walkthrough step's mission). */
  entry?: { slug: string; title: string; type: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: HubBlock[];
}

export interface PageInput {
  title: string;
  slug?: string | null;
  summary?: string | null;
  status?: PageStatus;
  parentId?: string | null;
  sortOrder?: number;
  spoilerStage?: string | null;
  eras?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  blocks?: HubBlock[];
  /** Top-level page whose sub-pages are the story walkthrough steps. */
  story?: boolean;
  /** Slug of the entry this page is about (null clears it). */
  entry?: string | null;
}

export const listEnginePages = (gameId: string) =>
  adminRequest<EnginePageRow[]>(`${base(gameId)}/pages`);
export const getEnginePage = (gameId: string, id: string) =>
  adminRequest<EnginePage>(`${base(gameId)}/pages/${enc(id)}`);
export const createEnginePage = (gameId: string, input: PageInput) =>
  adminRequest<EnginePage>(`${base(gameId)}/pages`, {
    method: "POST",
    body: input,
  });
export const updateEnginePage = (
  gameId: string,
  id: string,
  input: PageInput,
) =>
  adminRequest<EnginePage>(`${base(gameId)}/pages/${enc(id)}`, {
    method: "PUT",
    body: input,
  });
export const deleteEnginePage = (gameId: string, id: string) =>
  adminRequest<{ ok: true }>(`${base(gameId)}/pages/${enc(id)}`, {
    method: "DELETE",
  });
export const reorderEnginePages = (
  gameId: string,
  items: { id: string; parentId: string | null; sortOrder: number }[],
) =>
  adminRequest<EnginePageRow[]>(`${base(gameId)}/pages/order`, {
    method: "PUT",
    body: { items },
  });

/** Read a picked file as a data URL (uploads go through the API as base64). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the file"));
    r.readAsDataURL(file);
  });
}

/** Lines to show for any thrown error. */
export function errorLines(err: unknown): string[] {
  if (err instanceof EngineError) return err.lines;
  return [(err as Error)?.message || "Something went wrong"];
}
