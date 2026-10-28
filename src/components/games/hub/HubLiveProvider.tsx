"use client";

// Live state for a mega hub: the Day One count, the prediction tally and the
// signed-in viewer's own picks. Server HTML ships the counts from build time
// (crawlable); on mount we fetch fresh counts once (no polling) and, for a
// signed-in reader, their own state. Writes go through /api/hubs/* (BFF).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInModal from "@/components/auth/SignInModal";
import { track } from "@/lib/analytics";
import type {
  DayOnePlatform,
  HubLive,
  HubMe,
  PredictionBand,
} from "@/lib/hubs/types";

interface Ctx {
  slug: string;
  gameName: string;
  live: HubLive;
  me: HubMe | null;
  signedIn: boolean;
  busy: boolean;
  error: string | null;
  joinDayOne: (platform?: DayOnePlatform) => Promise<void>;
  leaveDayOne: () => Promise<void>;
  predict: (band: PredictionBand) => Promise<void>;
}

const HubLiveContext = createContext<Ctx | null>(null);

export function useHubLive(): Ctx {
  const ctx = useContext(HubLiveContext);
  if (!ctx) throw new Error("useHubLive must be used within <HubLiveProvider>");
  return ctx;
}

type Pending =
  | { kind: "join"; platform?: DayOnePlatform }
  | { kind: "predict"; band: PredictionBand }
  | null;

export default function HubLiveProvider({
  slug,
  gameName,
  initial,
  children,
}: {
  slug: string;
  gameName: string;
  initial: HubLive;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const [live, setLive] = useState<HubLive>(initial);
  const [me, setMe] = useState<HubMe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  // Fresh counts once per page view.
  useEffect(() => {
    let off = false;
    fetch(`/api/hubs/${slug}/live`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HubLive | null) => {
        if (!off && d) setLive(d);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [slug]);

  // The viewer's own state, once signed in.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setMe(null);
      return;
    }
    let off = false;
    fetch(`/api/hubs/${slug}/me`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HubMe | null) => {
        if (!off && d) setMe(d);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [slug, user, loading]);

  const send = useCallback(
    async (method: "PUT" | "DELETE", action: string, body?: unknown) => {
      setBusy(true);
      setError(null);
      try {
        const r = await fetch(`/api/hubs/${slug}/${action}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          setError(
            r.status === 429
              ? "Slow down a sec, then try again."
              : (d?.message as string) || "That didn't go through. Try again.",
          );
          return false;
        }
        if (d?.live) setLive(d.live);
        if (d?.me) setMe(d.me);
        return true;
      } catch {
        setError("Couldn't reach Nexzy. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [slug],
  );

  const joinDayOne = useCallback(
    async (platform?: DayOnePlatform) => {
      if (!user) {
        setPending({ kind: "join", platform });
        return;
      }
      const ok = await send("PUT", "day-one", platform ? { platform } : {});
      if (ok) track("hub_day_one_join", { slug, platform: platform ?? "" });
    },
    [user, send, slug],
  );

  const leaveDayOne = useCallback(async () => {
    const ok = await send("DELETE", "day-one");
    if (ok) track("hub_day_one_leave", { slug });
  }, [send, slug]);

  const predict = useCallback(
    async (band: PredictionBand) => {
      if (!user) {
        setPending({ kind: "predict", band });
        return;
      }
      const ok = await send("PUT", "prediction", { band });
      if (ok) track("hub_predict", { slug, band });
    },
    [user, send, slug],
  );

  // Finish what they clicked once the sign-in popup succeeds.
  const onSignedIn = useCallback(async () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.kind === "join") {
      const ok = await send(
        "PUT",
        "day-one",
        p.platform ? { platform: p.platform } : {},
      );
      if (ok) track("hub_day_one_join", { slug, via: "signin" });
    } else {
      const ok = await send("PUT", "prediction", { band: p.band });
      if (ok) track("hub_predict", { slug, band: p.band, via: "signin" });
    }
  }, [pending, send, slug]);

  return (
    <HubLiveContext.Provider
      value={{
        slug,
        gameName,
        live,
        me,
        signedIn: !!user,
        busy,
        error,
        joinDayOne,
        leaveDayOne,
        predict,
      }}
    >
      {children}
      <SignInModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onSignedIn={onSignedIn}
        title={
          pending?.kind === "predict"
            ? "Lock in your prediction"
            : `You're in for ${gameName}?`
        }
        subtitle={
          pending?.kind === "predict"
            ? "Sign in so we can tell you if you called it at launch."
            : "Sign in to count yourself in and get your Day One badge."
        }
      />
    </HubLiveContext.Provider>
  );
}
