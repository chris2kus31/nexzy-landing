"use client";

// Hands the hub's resolved wording (from the server render) to the client
// components on the page. One object per page; no fetching here.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeHubT, type HubCopy, type HubT } from "@/lib/hubs/copy";

const Ctx = createContext<HubT | null>(null);

export function HubCopyProvider({
  copy,
  children,
}: {
  copy: HubCopy;
  children: ReactNode;
}) {
  const t = useMemo(() => makeHubT(copy), [copy]);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

export function useHubT(): HubT {
  const t = useContext(Ctx);
  if (!t) throw new Error("useHubT must be used within <HubCopyProvider>");
  return t;
}
