"use client";

import type { ReactNode } from "react";
import { Link, type LinkProps } from "@chakra-ui/react";
import { trackDownload } from "@/lib/analytics";

/**
 * A tiny client leaf: an app-store link that fires the `app_download_click`
 * event. Lets otherwise-static parents (Footer, CTA, app page) stay SERVER
 * components — only this leaf ships to the client. Forwards all Chakra Link
 * props (href, target, styling…).
 */
export default function StoreLink({
  store,
  location,
  ...props
}: LinkProps & { store: "ios" | "android"; location: string }) {
  return <Link {...props} onClick={() => trackDownload(store, location)} />;
}

/**
 * Plain-anchor variant for use inside `<Button asChild>` (Chakra merges props
 * onto this native <a>). Same download tracking, still a client leaf.
 */
export function StoreAnchor({
  store,
  location,
  href,
  children,
}: {
  store: "ios" | "android";
  location: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackDownload(store, location)}
    >
      {children}
    </a>
  );
}
