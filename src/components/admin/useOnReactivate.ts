"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `fn` each time `active` flips from false back to true — NOT on the
 * first activation (the panel's own mount effect does the initial load).
 *
 * Content Studio keeps visited sub-tabs mounted (hidden) so in-progress edits
 * survive a tab switch. The side effect is that a mount-only fetch never runs
 * again, so a tab shows stale data until a full page reload. Panels use this
 * to quietly refetch their list when the user comes back to them.
 */
export function useOnReactivate(active: boolean, fn: () => void): void {
  const fnRef = useRef(fn);
  // Keep the latest callback without writing a ref during render.
  useEffect(() => {
    fnRef.current = fn;
  });
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) fnRef.current();
    wasActive.current = active;
  }, [active]);
}
