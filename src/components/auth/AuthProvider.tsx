"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface ReaderUser {
  id: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isVerified?: boolean;
  authProvider?: string | null;
}

interface AuthContextValue {
  user: ReaderUser | null;
  loading: boolean;
  /** Called by the sign-in panel after a successful token exchange. */
  applySession: (user: ReaderUser) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Signed-in hint (keeps signed-out visitors off the server) ----
// The session itself lives in httpOnly cookies JS can't read, so every page
// view used to call /api/auth/me — a Netlify function invocation — even for the
// (vast majority of) visitors who never signed in. `nx_si=1` is a plain,
// non-secret hint cookie: present => check the session; absent => skip.
// It grants nothing (the server still validates the real cookies).
// Readers who signed in before this hint existed are covered by a one-time
// probe per browser (localStorage), after which the hint takes over.
const HINT_COOKIE = "nx_si";
const HINT_MAX_AGE = 60 * 60 * 24 * 30; // matches the 30-day refresh token
const PROBE_KEY = "nx_auth_probe_v1";

function hasHint(): boolean {
  try {
    return document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${HINT_COOKIE}=1`));
  } catch {
    return false;
  }
}

function setHint(on: boolean) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = on
      ? `${HINT_COOKIE}=1; Path=/; Max-Age=${HINT_MAX_AGE}; SameSite=Lax${secure}`
      : `${HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    // cookies blocked — the one-time probe still covers this browser
  }
}

/** True once this browser has done its one-time session probe. */
function alreadyProbed(): boolean {
  try {
    return localStorage.getItem(PROBE_KEY) === "1";
  } catch {
    return false; // storage blocked: always check, same as before
  }
}

function markProbed() {
  try {
    localStorage.setItem(PROBE_KEY, "1");
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReaderUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const u = data.user ?? null;
        setUser(u);
        setHint(!!u);
      } else {
        setUser(null);
        // Only a definite "no session" clears the hint; a 502/timeout keeps
        // it so a signed-in reader is re-checked on the next page.
        if (res.status === 401) setHint(false);
      }
    } catch {
      setUser(null);
    } finally {
      markProbed();
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Signed-out visitor (no hint) who was already probed once: nothing to
    // check, so no server call. Everyone else checks exactly as before.
    if (!hasHint() && alreadyProbed()) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const applySession = useCallback((u: ReaderUser & { userName?: string }) => {
    // Backend UserDto may expose the handle as `userName`; normalize it.
    setUser({ ...u, username: u.username ?? u.userName ?? null });
    setHint(true);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setHint(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, applySession, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
