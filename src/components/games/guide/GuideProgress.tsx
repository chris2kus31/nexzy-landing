"use client";

// "Found it" progress for a game's guide. Free and unlimited for everyone:
// guests keep ticks in this browser; signing in moves them to the account
// (one sync call), after which web and app share them. One provider per page,
// so every checklist and pin on the page reads the same set.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";

interface Ctx {
  found: Set<string>;
  ready: boolean;
  signedIn: boolean;
  toggle: (entryId: string) => void;
  /** Reader preferences, remembered per game in this browser. */
  era: string | null;
  setEra: (era: string | null) => void;
  /** null = no spoilers, "all" = show everything, else the furthest stage. */
  spoiler: string | null;
  setSpoiler: (stage: string | null) => void;
}

const ProgressContext = createContext<Ctx | null>(null);
const key = (slug: string) => `nexzy-guide-progress:${slug}`;
const prefKey = (slug: string) => `nexzy-guide-prefs:${slug}`;

function readPrefs(slug: string): {
  era: string | null;
  spoiler: string | null;
} {
  try {
    const v = JSON.parse(window.localStorage.getItem(prefKey(slug)) || "{}");
    return {
      era: typeof v.era === "string" ? v.era : null,
      spoiler: typeof v.spoiler === "string" ? v.spoiler : null,
    };
  } catch {
    return { era: null, spoiler: null };
  }
}

function writePrefs(
  slug: string,
  p: { era: string | null; spoiler: string | null },
) {
  try {
    window.localStorage.setItem(prefKey(slug), JSON.stringify(p));
  } catch {
    /* blocked storage: preference lasts for this visit only */
  }
}
const MAX_LOCAL = 2000;

function readLocal(slug: string): string[] {
  try {
    const raw = window.localStorage.getItem(key(slug));
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_LOCAL)
      : [];
  } catch {
    return [];
  }
}

function writeLocal(slug: string, ids: Set<string>): void {
  try {
    if (ids.size)
      window.localStorage.setItem(key(slug), JSON.stringify([...ids]));
    else window.localStorage.removeItem(key(slug));
  } catch {
    /* private mode / blocked storage: progress lives in memory only */
  }
}

export function GuideProgressProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const [found, setFound] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const synced = useRef<string | null>(null);
  const [era, setEraState] = useState<string | null>(null);
  const [spoiler, setSpoilerState] = useState<string | null>(null);

  useEffect(() => {
    const p = readPrefs(slug);
    setEraState(p.era);
    setSpoilerState(p.spoiler);
  }, [slug]);

  const setEra = useCallback(
    (v: string | null) => {
      setEraState(v);
      writePrefs(slug, { ...readPrefs(slug), era: v });
    },
    [slug],
  );
  const setSpoiler = useCallback(
    (v: string | null) => {
      setSpoilerState(v);
      writePrefs(slug, { ...readPrefs(slug), spoiler: v });
    },
    [slug],
  );

  useEffect(() => {
    if (loading) return;
    let alive = true;
    const local = readLocal(slug);
    if (!user) {
      synced.current = null;
      setFound(new Set(local));
      setReady(true);
      return;
    }
    if (synced.current === user.id) return;
    synced.current = user.id;
    const run = async () => {
      try {
        const res = local.length
          ? await fetch(`/api/hub-engine/${slug}/progress/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entryIds: local }),
            })
          : await fetch(`/api/hub-engine/${slug}/progress`, {
              cache: "no-store",
            });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { entryIds: string[] };
        if (!alive) return;
        setFound(new Set(data.entryIds));
        if (local.length) {
          writeLocal(slug, new Set());
          track("guide_progress_synced", { slug, count: local.length });
        }
      } catch {
        if (alive) setFound(new Set(local));
      } finally {
        if (alive) setReady(true);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [slug, user, loading]);

  const foundRef = useRef(found);
  foundRef.current = found;
  // One request at a time per entry, so a fast tap-tap lands in order.
  const chains = useRef(new Map<string, Promise<unknown>>());

  const toggle = useCallback(
    (entryId: string) => {
      const on = !foundRef.current.has(entryId);
      const next = new Set(foundRef.current);
      if (on) next.add(entryId);
      else next.delete(entryId);
      foundRef.current = next;
      setFound(next);
      if (on) track("guide_found", { slug });
      if (!user) {
        writeLocal(slug, next);
        return;
      }
      const prev = chains.current.get(entryId) ?? Promise.resolve();
      const run = prev.then(async () => {
        const r = await fetch(`/api/hub-engine/${slug}/progress/${entryId}`, {
          method: on ? "PUT" : "DELETE",
        }).catch(() => null);
        if (!r || !r.ok) {
          // Roll back this one change only.
          setFound((cur) => {
            const back = new Set(cur);
            if (on) back.delete(entryId);
            else back.add(entryId);
            foundRef.current = back;
            return back;
          });
        }
      });
      chains.current.set(entryId, run);
      // Settled chains are dropped so a long session never piles them up.
      void run.finally(() => {
        if (chains.current.get(entryId) === run) chains.current.delete(entryId);
      });
    },
    [slug, user],
  );

  const value = useMemo(
    () => ({
      found,
      ready,
      signedIn: !!user,
      toggle,
      era,
      setEra,
      spoiler,
      setSpoiler,
    }),
    [found, ready, user, toggle, era, setEra, spoiler, setSpoiler],
  );
  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useGuideProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useGuideProgress needs <GuideProgressProvider>");
  return ctx;
}
