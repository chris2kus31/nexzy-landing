"use client";

import { useEffect, useState } from "react";

// The only hostnames that should send analytics. Everything else — Netlify
// deploy previews (*.netlify.app), branch deploys, localhost — is excluded so
// test/preview traffic never pollutes the production GA4 + Clarity properties.
const PROD_HOSTS = ["nexzyapp.com", "www.nexzyapp.com"];

/**
 * Client hook: true only once mounted on a production hostname. Starts false
 * (matches SSR) and flips after mount, so gating a component's render on it is
 * hydration-safe — the analytics tags simply don't load off-prod.
 */
export function useIsProdHost(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(PROD_HOSTS.includes(window.location.hostname));
  }, []);
  return ok;
}
