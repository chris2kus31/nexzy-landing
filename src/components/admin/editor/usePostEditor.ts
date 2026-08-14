"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  getPost,
  updatePost,
  suggestAlt,
  uploadArticleImage,
  getWriterNames,
  type BlogPost,
  type ArticleMedia,
  type RewindFacts,
  type ArticleFormatData,
} from "@/lib/admin/client";
import { youtubeId } from "@/lib/blog/youtube";
import { BYLINES, type FormState, toForm } from "./shared";

/** The poll while it's being edited — options as plain strings for the UI. */
export interface PollDraft {
  question: string;
  options: string[];
}

function pollFromPost(p: BlogPost): PollDraft {
  const opts = (p.poll?.options ?? []).map((o) => o.label);
  return { question: p.poll?.question ?? "", options: opts };
}

/**
 * The article's video list for the editor, with backward-compat: if `media` is
 * empty but the legacy `youtubeUrl` is set, show it as a single starred item so
 * older articles seed the gallery. Mirrors the API's resolve fallback.
 */
export function mediaFromPost(p: BlogPost): ArticleMedia[] {
  if (Array.isArray(p.media) && p.media.length) return p.media;
  const id = youtubeId(p.youtubeUrl || "");
  if (p.youtubeUrl && id) {
    return [
      {
        type: "youtube",
        url: p.youtubeUrl,
        videoId: id,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        featured: true,
        source: "auto-finder",
      },
    ];
  }
  return [];
}

/**
 * The shared editor "engine": all post-editing state and the actions both the
 * article editor and the guide editor need (load, save, run-an-action, image
 * upload, alt suggest). Keeping this here means the two editor UIs can diverge
 * freely without duplicating — or drifting on — the actual behavior.
 */
export function usePostEditor(id: string) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [media, setMedia] = useState<ArticleMedia[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [facts, setFacts] = useState<RewindFacts>({});
  const [poll, setPoll] = useState<PollDraft>({ question: "", options: [] });
  const [formatData, setFormatData] = useState<ArticleFormatData>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [notice, setNotice] = useState("");
  const [authorSel, setAuthorSel] = useState("");
  const [bylines, setBylines] = useState<string[]>(BYLINES);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getWriterNames()
      .then((names) => setBylines([...names, "Nexzy Editorial"]))
      .catch(() => {});
  }, []);

  const load = () =>
    getPost(id)
      .then((p) => {
        setPost(p);
        setForm(toForm(p));
        setMedia(mediaFromPost(p));
        setScreenshots(p.screenshots ?? []);
        setFacts(p.rewindFacts ?? {});
        setPoll(pollFromPost(p));
        setFormatData(p.formatData ?? {});
        setAuthorSel(p.author || "Nexzy Editorial");
      })
      .catch((e) => setError(e?.message || "Failed to load."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const run = async (label: string, fn: () => Promise<BlogPost>) => {
    setBusy(label);
    setNotice("");
    setError("");
    try {
      const updated = await fn();
      setPost(updated);
      setForm(toForm(updated));
      setMedia(mediaFromPost(updated));
      setScreenshots(updated.screenshots ?? []);
      setFacts(updated.rewindFacts ?? {});
      setPoll(pollFromPost(updated));
      setFormatData(updated.formatData ?? {});
      setAuthorSel(updated.author || "Nexzy Editorial");
      setNotice(`${label} ✓`);
    } catch (e) {
      setError((e as Error)?.message || `${label} failed.`);
    } finally {
      setBusy("");
    }
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large (max 10 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      run("Image uploaded", () => uploadArticleImage(id, dataUrl));
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  // Empty/whitespace → null, so a cleared field falls back to a stub on the page.
  const nz = (s?: string | null) => {
    const t = (s ?? "").trim();
    return t ? t : null;
  };

  const buildUpdate = (bodyMarkdown: string, shotsOverride?: string[]) => ({
    title: form!.title,
    seoTitle: form!.seoTitle,
    excerpt: form!.excerpt,
    // The answer-first lede + the reader poll (chassis). Poll is stored only
    // when valid (question + >= 2 options); cleared to null otherwise.
    answerCapsule: nz(form!.answerCapsule),
    poll: (() => {
      const q = poll.question.trim();
      const options = poll.options
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((label) => ({ label }));
      return q && options.length >= 2 ? { question: q, options } : null;
    })(),
    // Beat core module (Deals / Patch). Only sent for those beats so other
    // posts never touch formatData.
    ...(post?.beat === "deals" || post?.beat === "patch_notes"
      ? { formatData }
      : {}),
    seoDescription: form!.seoDescription,
    bodyMarkdown,
    imageAlt: form!.imageAlt,
    imageCredit: form!.imageCredit,
    // The media gallery is the source of truth; the API re-syncs youtubeUrl to
    // the starred item. Send order by current position.
    media: media.map((m, i) => ({ ...m, order: i })),
    screenshots: shotsOverride ?? screenshots,
    // Rewind-only: the spec-sheet facts. News/guide posts never include this, so
    // the newsroom save path is untouched.
    ...(post?.type === "rewind"
      ? {
          rewindFacts: {
            publisher: nz(facts.publisher),
            developer: nz(facts.developer),
            players: nz(facts.players),
            genre: nz(facts.genre),
            features: (facts.features ?? [])
              .map((f) => f.trim())
              .filter(Boolean)
              .slice(0, 8),
            historicalNote: nz(facts.historicalNote),
          },
        }
      : {}),
    tags: form!.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    faq: form!.faq
      .split("\n")
      .map((line) => {
        const idx = line.indexOf("::");
        if (idx < 0) return null;
        const q = line.slice(0, idx).trim();
        const a = line.slice(idx + 2).trim();
        return q && a ? { q, a } : null;
      })
      .filter((x): x is { q: string; a: string } => x !== null),
  });

  const save = () =>
    run("Saved", () => updatePost(id, buildUpdate(form!.bodyMarkdown)));

  // Persist a new body immediately — used by the screenshot uploader so a filled
  // shot behaves like the hero upload (saved on the spot), not a draft edit that
  // silently needs a manual Save.
  const saveBody = (nextBody: string) =>
    run("Screenshot added", () => updatePost(id, buildUpdate(nextBody)));

  // Rewind screenshot gallery: persist the list immediately (like the hero
  // upload) so an added/removed/reordered shot doesn't silently need a Save.
  const saveScreenshots = (next: string[]) => {
    setScreenshots(next);
    return run("Screenshots saved", () =>
      updatePost(id, buildUpdate(form!.bodyMarkdown, next)),
    );
  };

  const suggestAltText = async () => {
    setBusy("Suggesting alt");
    setNotice("");
    setError("");
    try {
      const { alt } = await suggestAlt(id);
      if (alt) {
        set("imageAlt", alt);
        setNotice("Alt suggested ✓ — review and Save");
      } else {
        setError("Couldn't suggest alt text.");
      }
    } catch (e) {
      setError((e as Error)?.message || "Suggest failed.");
    } finally {
      setBusy("");
    }
  };

  const isPublished = post?.status === "published";

  return {
    id,
    post,
    form,
    media,
    setMedia,
    screenshots,
    setScreenshots,
    saveScreenshots,
    facts,
    setFacts,
    poll,
    setPoll,
    formatData,
    setFormatData,
    error,
    busy,
    notice,
    authorSel,
    setAuthorSel,
    bylines,
    preview,
    setPreview,
    fileRef,
    load,
    set,
    run,
    save,
    saveBody,
    onPickImage,
    suggestAltText,
    isPublished,
  };
}

export type PostEditor = ReturnType<typeof usePostEditor>;
