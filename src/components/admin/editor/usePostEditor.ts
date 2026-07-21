"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  getPost,
  updatePost,
  suggestAlt,
  uploadArticleImage,
  getWriterNames,
  type BlogPost,
} from "@/lib/admin/client";
import { BYLINES, type FormState, toForm } from "./shared";

/**
 * The shared editor "engine": all post-editing state and the actions both the
 * article editor and the guide editor need (load, save, run-an-action, image
 * upload, alt suggest). Keeping this here means the two editor UIs can diverge
 * freely without duplicating — or drifting on — the actual behavior.
 */
export function usePostEditor(id: string) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
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

  const buildUpdate = (bodyMarkdown: string) => ({
    title: form!.title,
    seoTitle: form!.seoTitle,
    excerpt: form!.excerpt,
    seoDescription: form!.seoDescription,
    bodyMarkdown,
    imageAlt: form!.imageAlt,
    imageCredit: form!.imageCredit,
    youtubeUrl: form!.youtubeUrl.trim(),
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
